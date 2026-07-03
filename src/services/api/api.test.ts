import { describe, expect, it } from 'vitest'
import { API_PATHS, USE_REAL_API, normalizeApiError, whenReal } from './index'

describe('api client layer', () => {
  it('defaults to local simulation (flag off)', () => {
    // بيئة الاختبار بلا VITE_USE_REAL_API — الافتراضي محاكاة
    expect(USE_REAL_API).toBe(false)
  })

  it('whenReal returns the local fallback without touching the network when flag is off', async () => {
    let networkCalled = false
    const result = await whenReal(
      async () => {
        networkCalled = true
        return 'remote'
      },
      () => 'local',
    )
    expect(result).toBe('local')
    expect(networkCalled).toBe(false)
  })

  it('normalizes server, validation, and network errors to one shape', () => {
    // خطأ خادم برسالة
    const server = normalizeApiError({ response: { status: 403, data: { message: 'ممنوع' } } })
    expect(server).toEqual({ status: 403, message: 'ممنوع', fieldErrors: undefined })

    // خطأ تحقق 422 بأسلوب Laravel
    const validation = normalizeApiError({
      response: { status: 422, data: { message: 'بيانات ناقصة', errors: { email: ['البريد مطلوب'] } } },
    })
    expect(validation.status).toBe(422)
    expect(validation.fieldErrors?.email[0]).toBe('البريد مطلوب')

    // انقطاع شبكة (بلا response)
    const network = normalizeApiError(new Error('Network Error'))
    expect(network.status).toBe(0)
    expect(network.message).toBe('Network Error')

    // خادم بلا رسالة → رسالة افتراضية عربية
    const bare = normalizeApiError({ response: { status: 500, data: {} } })
    expect(bare.message).toContain('خطأ')
  })

  it('builds versioned paths matching the OpenAPI contract', () => {
    expect(API_PATHS.auth.login).toBe('/v1/auth/login')
    expect(API_PATHS.profile.skillProofs(7)).toBe('/v1/profile/skills/7/proofs')
    expect(API_PATHS.publicProfile.bySlug('ahmed-almansour')).toBe('/v1/public-profiles/ahmed-almansour')
    expect(API_PATHS.publicProfile.schedule('x')).toBe('/v1/public-profiles/x/schedule')
    expect(API_PATHS.interviewers.bookings(3)).toBe('/v1/interviewers/3/bookings')
    expect(API_PATHS.surveys.responses(5)).toBe('/v1/surveys/5/responses')
    expect(API_PATHS.ai('assistantReply')).toBe('/v1/ai/assistantReply')
  })
})
