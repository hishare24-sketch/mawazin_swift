import { Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import type { Server, Socket } from 'socket.io'
import type { DirectMessage } from './direct-message.entity'

/**
 * بوّابة البثّ اللحظي (Socket.IO) — بديل Supabase Realtime.
 * كل عميل يوثّق بتوكن JWT في المصافحة وينضمّ لغرفة باسم uuid الخاص به،
 * فتصله الرسائل الموجّهة إليه فورًا.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class MessagesGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server
  private readonly logger = new Logger('WS')

  constructor(private readonly jwt: JwtService) {}

  handleConnection(client: Socket) {
    try {
      const raw = (client.handshake.auth?.token as string)
        || (client.handshake.headers?.authorization as string)?.replace('Bearer ', '')
      const payload = this.jwt.verify<{ uuid: string }>(raw)
      client.data.uuid = payload.uuid
      client.join(payload.uuid) // غرفة لكل مستخدم
    }
    catch {
      client.disconnect() // توكن غير صالح
    }
  }

  /** يدفع رسالة جديدة لغرفة المستقبِل (يصله لحظيًا إن كان متصلًا). */
  emitToUser(uuid: string, message: DirectMessage) {
    this.server.to(uuid).emit('message', message)
  }
}
