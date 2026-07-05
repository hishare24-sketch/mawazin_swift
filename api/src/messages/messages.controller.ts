import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUser } from '../common/current-user.decorator'
import type { User } from '../users/user.entity'
import { MessagesService } from './messages.service'
import { MessagesGateway } from './messages.gateway'
import { ReadThreadDto, SendMessageDto } from './dto/message.dto'

/** الرسائل المباشرة بين المستخدمين — تسليم علائقي + بثّ لحظي عبر البوّابة. */
@Controller('direct-messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private readonly service: MessagesService,
    private readonly gateway: MessagesGateway,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async send(@CurrentUser() user: User, @Body() dto: SendMessageDto) {
    const msg = await this.service.send(user.uuid, user.name, dto)
    this.gateway.emitToUser(dto.recipientId, msg) // يصل المستقبِل لحظيًا
    return msg
  }

  @Get()
  listMine(@CurrentUser() user: User) {
    return this.service.listMine(user.uuid)
  }

  @Post('read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(@CurrentUser() user: User, @Body() dto: ReadThreadDto) {
    return this.service.markThreadRead(user.uuid, dto.peerId)
  }

  @Get('resolve/:slug')
  resolve(@Param('slug') slug: string) {
    return this.service.resolveOwner(slug)
  }
}
