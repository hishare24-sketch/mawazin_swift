import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { rmSync } from 'node:fs'
import { UnprocessableEntityException, ValidationPipe } from '@nestjs/common'
import type { ValidationError, INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { io as ioClient } from 'socket.io-client'

// قاعدة اختبار معزولة (ملف مؤقّت يُحذف بعد الجولة) — قبل تحميل AppModule
const DB_FILE = join(tmpdir(), `srs-e2e-${process.pid}.sqlite`)
process.env.DB_CONNECTION = 'sqljs'
process.env.DB_SQLITE_FILE = DB_FILE
process.env.JWT_SECRET = 'test-secret'

// eslint-disable-next-line ts/no-var-requires
import { AppModule } from '../src/app.module'
import { ResponseInterceptor } from '../src/common/response.interceptor'
import { HttpExceptionFilter } from '../src/common/http-exception.filter'

/**
 * اختبار تكامل شامل للمرحلة 2 — يمرّ على كل مورد في openapi.yaml حيًّا
 * (تسجيل → توكن → كل نقطة) مقابل قاعدة SQLite في ملف مؤقّت.
 */
describe('Phase 2 resources (e2e)', () => {
  let app: INestApplication
  let http: ReturnType<typeof request>
  let token: string
  let slug: string
  const auth = () => ({ Authorization: `Bearer ${token}` })

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const bag: Record<string, string[]> = {}
        for (const e of errors)
          bag[e.property] = Object.values(e.constraints ?? {})
        return new UnprocessableEntityException({ message: 'المدخلات غير صحيحة', errors: bag })
      },
    }))
    app.useGlobalInterceptors(new ResponseInterceptor())
    app.useGlobalFilters(new HttpExceptionFilter())
    // listen على منفذ عشوائي — يلزم لبوّابة Socket.IO (init وحده لا يفتح منفذًا)
    await app.listen(0)
    http = request(app.getHttpServer())
  })

  afterAll(async () => {
    await app?.close()
    try { rmSync(DB_FILE, { force: true }) }
    catch { /* ignore */ }
  })

  it('auth: register issues a token', async () => {
    const res = await http.post('/api/v1/auth/register').send({
      name: 'تجربة المرحلة الثانية', email: 'phase2@test.local', password: 'password123',
    }).expect(201)
    expect(res.body.data.token).toBeDefined()
    expect(res.body.data.user.email).toBe('phase2@test.local')
    token = res.body.data.token
  })

  it('auth: me returns current user with tier', async () => {
    const res = await http.get('/api/v1/auth/me').set(auth()).expect(200)
    expect(res.body.data.tier).toBe('free')
  })

  it('profile: get → patch → add skill (self proof) → add proof → delete', async () => {
    await http.get('/api/v1/profile').set(auth()).expect(200)
    const patched = await http.patch('/api/v1/profile').set(auth()).send({ headline: 'مطوّر' }).expect(200)
    expect(patched.body.data.headline).toBe('مطوّر')

    const skill = await http.post('/api/v1/profile/skills').set(auth()).send({ name: 'Vue', selfLevel: 4 }).expect(201)
    expect(skill.body.data.proofs).toHaveLength(1)
    expect(skill.body.data.proofs[0].type).toBe('self')
    const skillId = skill.body.data.id

    const withProof = await http.post(`/api/v1/profile/skills/${skillId}/proofs`).set(auth())
      .send({ type: 'certificate', label: 'شهادة Vue' }).expect(201)
    expect(withProof.body.data.proofs).toHaveLength(2)

    await http.delete(`/api/v1/profile/skills/${skillId}`).set(auth()).expect(204)
  })

  it('profile: whole-doc PATCH persists skills/experiences/certificates/prefs', async () => {
    const doc = {
      headline: 'مطوّر واجهات',
      skills: [{ id: 1, name: 'Vue', selfLevel: 5, proofs: [] }],
      experiences: [{ id: 1, title: 'مطوّر', company: 'شركة', period: '2022', desc: '' }],
      certificates: [{ id: 1, name: 'Vue Pro', issuer: 'Vue School', date: '2023' }],
      prefs: { location: 'الرياض', self_offer_active: true },
    }
    await http.patch('/api/v1/profile').set(auth()).send(doc).expect(200)
    const got = await http.get('/api/v1/profile').set(auth()).expect(200)
    expect(got.body.data.skills).toHaveLength(1)
    expect(got.body.data.experiences[0].company).toBe('شركة')
    expect(got.body.data.prefs.self_offer_active).toBe(true)
  })

  it('account: plan free → wallet welcome balance → upgrade pro → elite blocked (402)', async () => {
    const plan = await http.get('/api/v1/account/plan').set(auth()).expect(200)
    expect(plan.body.data.tier).toBe('free')

    const wallet = await http.get('/api/v1/wallet').set(auth()).expect(200)
    expect(wallet.body.data.balance).toBe(100)

    const pro = await http.put('/api/v1/account/plan').set(auth()).send({ tier: 'pro' }).expect(200)
    expect(pro.body.data.tier).toBe('pro')
    expect(pro.body.data.balance).toBe(50)

    // elite يكلّف 100 والرصيد 50 → 402
    await http.put('/api/v1/account/plan').set(auth()).send({ tier: 'elite' }).expect(402)
  })

  it('surveys: create (within pro limit) → list → respond draws from pool', async () => {
    const survey = await http.post('/api/v1/surveys').set(auth())
      .send({ title: 'رضا الموظفين', pointsPool: 3, state: 'active' }).expect(201)
    const id = survey.body.data.id
    expect(survey.body.data.pointsPool).toBe(3)

    const list = await http.get('/api/v1/surveys').set(auth()).expect(200)
    expect(list.body.data.length).toBeGreaterThanOrEqual(1)

    await http.post(`/api/v1/surveys/${id}/responses`).send({ q1: 'ممتاز' }).expect(201)
    const after = await http.get('/api/v1/surveys').set(auth()).expect(200)
    expect(after.body.data.find((s: { id: number }) => s.id === id).pointsPool).toBe(2)
  })

  it('public-profiles: owner edit creates slug; visitor view/follow/rate/comment/testimonial/proof-request', async () => {
    const mine = await http.patch('/api/v1/public-profiles/me').set(auth())
      .send({ publicHeadline: 'مطوّر واجهات', tagline: 'أبني تجارب' }).expect(200)
    slug = mine.body.data.slug
    expect(slug).toBeTruthy()

    await http.get(`/api/v1/public-profiles/${slug}`).expect(200)
    await http.post(`/api/v1/public-profiles/${slug}/view`).expect(204)

    const follow = await http.post(`/api/v1/public-profiles/${slug}/follow`).send({}).expect(200)
    expect(follow.body.data.followersCount).toBe(1)

    const rate = await http.post(`/api/v1/public-profiles/${slug}/rate`).send({ stars: 5 }).expect(200)
    expect(rate.body.data.avgRating).toBe(5)
    expect(rate.body.data.ratingCount).toBe(1)

    const comment = await http.post(`/api/v1/public-profiles/${slug}/comments`).send({ author: 'زائر', text: 'رائع' }).expect(201)
    expect(comment.body.data.hidden).toBe(false)

    await http.post(`/api/v1/public-profiles/${slug}/contact`).send({ visitorName: 'جهة', text: 'نودّ التواصل' }).expect(204)
    await http.post(`/api/v1/public-profiles/${slug}/schedule`).send({ visitorName: 'جهة', day: 'الأحد', slot: '10ص' }).expect(204)

    const testi = await http.post(`/api/v1/public-profiles/${slug}/testimonials`).send({ author: 'زميل', excerpt: 'محترف' }).expect(201)
    expect(testi.body.data.visible).toBe(false)

    // طلب إثبات من زائر → يصل مالك الصفحة في ملفه الخاص
    await http.post(`/api/v1/public-profiles/${slug}/proof-requests`).send({ skill: 'Vue', from: 'زميل' }).expect(204)
    const reqs = await http.get('/api/v1/profile/proof-requests').set(auth()).expect(200)
    expect(reqs.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('public-profiles: unknown slug → 404', async () => {
    await http.get('/api/v1/public-profiles/does-not-exist').expect(404)
  })

  it('public-profiles: GET /me get-or-create + doc blob round-trips (owner presentation)', async () => {
    const mine = await http.get('/api/v1/public-profiles/me').set(auth()).expect(200)
    expect(mine.body.data.slug).toBe(slug) // نفس صفحة المالك المُنشأة سابقًا
    expect(mine.body.data.doc).toBeDefined()
    expect(mine.body.data.stats).toBeDefined()

    // حفظ وثيقة العرض الكاملة (كتلة doc) — حقول لا يمثّلها المخطط المُصنَّف
    await http.patch('/api/v1/public-profiles/me').set(auth())
      .send({ doc: { story: 'قصتي', featuredSkillIds: [1, 2], selectedSkillIds: [1, 2, 3], contactEnabled: true } }).expect(200)

    const back = await http.get('/api/v1/public-profiles/me').set(auth()).expect(200)
    expect(back.body.data.doc.story).toBe('قصتي')
    expect(back.body.data.doc.featuredSkillIds).toEqual([1, 2])
    // العام يعرض الوثيقة مسطّحة، ويخفي الداخلي (inbox/doc)
    const pub = await http.get(`/api/v1/public-profiles/${slug}`).expect(200)
    expect(pub.body.data.story).toBe('قصتي')
    expect(pub.body.data.inbox).toBeUndefined()
    expect(pub.body.data.doc).toBeUndefined()
  })

  it('marketplace: opportunities list (seeded) → filter → create → apply; requests list + mine', async () => {
    const opps = await http.get('/api/v1/opportunities').set(auth()).expect(200)
    expect(opps.body.data.length).toBeGreaterThanOrEqual(3)

    const filtered = await http.get('/api/v1/opportunities?category=data').set(auth()).expect(200)
    expect(filtered.body.data.every((o: { category: string }) => o.category === 'data')).toBe(true)

    const created = await http.post('/api/v1/opportunities').set(auth())
      .send({ title: 'مطوّر Node', company: 'شركتي', category: 'tech', skills: ['NestJS'] }).expect(201)
    await http.post(`/api/v1/opportunities/${created.body.data.id}/apply`).set(auth()).expect(201)

    const requests = await http.get('/api/v1/requests').set(auth()).expect(200)
    expect(requests.body.data.length).toBeGreaterThanOrEqual(3)
    const mine = await http.get('/api/v1/requests/mine').set(auth()).expect(200)
    expect(Array.isArray(mine.body.data)).toBe(true)
  })

  it('interviewers: list (seeded) → book → patch status', async () => {
    const list = await http.get('/api/v1/interviewers').set(auth()).expect(200)
    expect(list.body.data.length).toBeGreaterThanOrEqual(3)
    const interviewerId = list.body.data[0].id

    const booking = await http.post(`/api/v1/interviewers/${interviewerId}/bookings`).set(auth())
      .send({ day: 'الأحد', slot: '10ص', type: 'tech' }).expect(201)
    expect(booking.body.data.status).toBe('pending')

    const updated = await http.patch(`/api/v1/bookings/${booking.body.data.id}`).set(auth())
      .send({ status: 'accepted' }).expect(200)
    expect(updated.body.data.status).toBe('accepted')
  })

  it('interviews: create → list', async () => {
    await http.post('/api/v1/interviews').set(auth()).send({ track: 'tech' }).expect(201)
    const list = await http.get('/api/v1/interviews').set(auth()).expect(200)
    expect(list.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('notifications: list seeds welcome → read-all', async () => {
    const list = await http.get('/api/v1/notifications').set(auth()).expect(200)
    expect(list.body.data.length).toBeGreaterThanOrEqual(1)
    await http.post('/api/v1/notifications/read-all').set(auth()).expect(204)
    const after = await http.get('/api/v1/notifications').set(auth()).expect(200)
    expect(after.body.data.every((n: { read: boolean }) => n.read)).toBe(true)
  })

  it('account-states: blob get (null) → put → get round-trips per store', async () => {
    // لم تُحفظ بعد → null
    const empty = await http.get('/api/v1/account-states/applications').set(auth()).expect(200)
    expect(empty.body.data).toBeNull()

    const blob = [{ id: 1, opportunityId: 7, status: 'submitted' }]
    await http.put('/api/v1/account-states/applications').set(auth()).send({ data: blob }).expect(200)

    const back = await http.get('/api/v1/account-states/applications').set(auth()).expect(200)
    expect(back.body.data).toEqual(blob)

    // مخزن آخر معزول
    const other = await http.get('/api/v1/account-states/postedOpportunities').set(auth()).expect(200)
    expect(other.body.data).toBeNull()
  })

  it('direct-messages: send persists + lists for both parties; resolve owner by slug', async () => {
    // مستخدم ثانٍ يستقبل الرسالة
    const bob = await http.post('/api/v1/auth/register').send({
      name: 'بوب', email: 'bob@test.local', password: 'password123',
    }).expect(201)
    const bobUuid = bob.body.data.user.uuid
    const bobToken = bob.body.data.token

    const sent = await http.post('/api/v1/direct-messages').set(auth())
      .send({ recipientId: bobUuid, recipientName: 'بوب', body: 'مرحبًا بوب' }).expect(201)
    expect(sent.body.data.senderName).toBe('تجربة المرحلة الثانية')
    expect(sent.body.data.recipientId).toBe(bobUuid)

    // يظهر لدى الطرفين
    const mine = await http.get('/api/v1/direct-messages').set(auth()).expect(200)
    expect(mine.body.data.some((m: { body: string }) => m.body === 'مرحبًا بوب')).toBe(true)
    const bobsBearer = () => ({ Authorization: `Bearer ${bobToken}` })
    const bobs = await http.get('/api/v1/direct-messages').set(bobsBearer()).expect(200)
    expect(bobs.body.data).toHaveLength(1)

    // بوب يعلّم الخيط مقروءًا
    await http.post('/api/v1/direct-messages/read').set(bobsBearer())
      .send({ peerId: mine.body.data[0].senderId }).expect(204)

    // حلّ مالك الصفحة من slug (أنشئ صفحة أولًا)
    const page = await http.patch('/api/v1/public-profiles/me').set(bobsBearer()).send({ doc: {} }).expect(200)
    const resolved = await http.get(`/api/v1/direct-messages/resolve/${page.body.data.slug}`).set(auth()).expect(200)
    expect(resolved.body.data.ownerId).toBe(bobUuid)
  })

  it('realtime: recipient receives the message over WebSocket', async () => {
    const url = await app.getUrl() // http://[::1]:<port>
    const base = url.replace('[::1]', '127.0.0.1')
    // بوب مسجّل من الاختبار السابق — سجّل الدخول لأخذ توكن جديد
    const bobLogin = await http.post('/api/v1/auth/login').send({ email: 'bob@test.local', password: 'password123' }).expect(200)
    const bobToken = bobLogin.body.data.token
    const bobUuid = bobLogin.body.data.user.uuid

    const received = await new Promise<{ body: string }>((resolve, reject) => {
      const socket = ioClient(base, { auth: { token: bobToken }, transports: ['websocket'], reconnection: false })
      const timer = setTimeout(() => { socket.close(); reject(new Error('timeout: no WS message')) }, 8000)
      socket.on('connect', () => {
        // أرسل بعد الاتصال ليضمن انضمام بوب لغرفته
        http.post('/api/v1/direct-messages').set(auth())
          .send({ recipientId: bobUuid, recipientName: 'بوب', body: 'رسالة لحظية' }).end(() => {})
      })
      socket.on('message', (msg: { body: string }) => { clearTimeout(timer); socket.close(); resolve(msg) })
      socket.on('connect_error', (e: Error) => { clearTimeout(timer); reject(e) })
    })
    expect(received.body).toBe('رسالة لحظية')
  })

  it('guards: protected route without token → 401', async () => {
    await http.get('/api/v1/profile').expect(401)
    await http.get('/api/v1/account-states/applications').expect(401)
  })
})
