import { IsString, MaxLength, MinLength } from 'class-validator'

export class SendMessageDto {
  @IsString() recipientId!: string
  @IsString() @MaxLength(255) recipientName!: string
  @IsString() @MinLength(1) @MaxLength(5000) body!: string
}

export class ReadThreadDto {
  @IsString() peerId!: string
}
