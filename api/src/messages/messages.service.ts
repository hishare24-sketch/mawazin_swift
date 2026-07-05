import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Repository } from 'typeorm'
import { PublicProfile } from '../public-profiles/public-profile.entity'
import { User } from '../users/user.entity'
import { DirectMessage } from './direct-message.entity'

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(DirectMessage) private readonly messages: Repository<DirectMessage>,
    @InjectRepository(PublicProfile) private readonly pages: Repository<PublicProfile>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  send(senderId: string, senderName: string, data: { recipientId: string, recipientName: string, body: string }): Promise<DirectMessage> {
    const msg = this.messages.create({
      senderId,
      recipientId: data.recipientId,
      senderName,
      recipientName: data.recipientName,
      body: data.body,
      read_at: null,
    })
    return this.messages.save(msg)
  }

  /** كل رسائل المستخدم (مُرسَلة ووارِدة) مرتّبة زمنيًا. */
  listMine(uuid: string): Promise<DirectMessage[]> {
    return this.messages.find({
      where: [{ senderId: uuid }, { recipientId: uuid }],
      order: { created_at: 'ASC' },
    })
  }

  async markThreadRead(uuid: string, peerId: string): Promise<void> {
    await this.messages.update(
      { recipientId: uuid, senderId: peerId, read_at: IsNull() },
      { read_at: new Date().toISOString() },
    )
  }

  /** يحلّ مالك صفحة تعريفية من الـslug → uuid واسمه (لتوجيه «تواصل معي»). */
  async resolveOwner(slug: string): Promise<{ ownerId: string, name: string } | null> {
    const page = await this.pages.findOne({ where: { slug } })
    if (!page)
      return null
    const user = await this.users.findOne({ where: { id: page.userId } })
    if (!user)
      return null
    const name = (page.doc as { displayName?: string })?.displayName || page.displayName || user.name
    return { ownerId: user.uuid, name }
  }
}
