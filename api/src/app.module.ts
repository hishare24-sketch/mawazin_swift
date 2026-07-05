import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { DatabaseModule } from './database/database.module'
import { HealthController } from './health/health.controller'
import { ProfileModule } from './profile/profile.module'
import { PublicProfilesModule } from './public-profiles/public-profiles.module'
import { AccountModule } from './account/account.module'
import { SurveysModule } from './surveys/surveys.module'
import { MarketplaceModule } from './marketplace/marketplace.module'
import { InterviewersModule } from './interviewers/interviewers.module'
import { InterviewsModule } from './interviews/interviews.module'
import { NotificationsModule } from './notifications/notifications.module'
import { AccountStatesModule } from './account-states/account-states.module'
import { MessagesModule } from './messages/messages.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    ProfileModule,
    PublicProfilesModule,
    AccountModule,
    SurveysModule,
    MarketplaceModule,
    InterviewersModule,
    InterviewsModule,
    NotificationsModule,
    AccountStatesModule,
    MessagesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
