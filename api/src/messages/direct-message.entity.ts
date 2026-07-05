import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

/**
 * رسالة مباشرة بين مستخدمين (تسليم علائقي حقيقي) — يقابل جدول Supabase
 * direct_messages السابق. المفتاح uuid المستخدم (كما في التوكن).
 */
@Entity('direct_messages')
export class DirectMessage {
  @PrimaryGeneratedColumn()
  id!: number

  @Index()
  @Column()
  senderId!: string

  @Index()
  @Column()
  recipientId!: string

  @Column()
  senderName!: string

  @Column()
  recipientName!: string

  @Column({ type: 'text' })
  body!: string

  @CreateDateColumn()
  created_at!: Date

  @Column({ type: 'varchar', nullable: true })
  read_at!: string | null
}
