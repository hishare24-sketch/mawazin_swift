import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module'
import { PublicProfile } from '../public-profiles/public-profile.entity'
import { User } from '../users/user.entity'
import { DirectMessage } from './direct-message.entity'
import { MessagesController } from './messages.controller'
import { MessagesService } from './messages.service'
import { MessagesGateway } from './messages.gateway'

@Module({
  // AuthModule يصدّر JwtModule — تستخدمه البوّابة للتحقّق من مصافحة WS
  imports: [TypeOrmModule.forFeature([DirectMessage, PublicProfile, User]), AuthModule],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway],
})
export class MessagesModule {}
