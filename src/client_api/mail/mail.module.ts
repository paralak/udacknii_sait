import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailCredentials } from 'src/db/mail_credentials.entity';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([MailCredentials]),
    ],
    controllers: [MailController],
    providers: [MailService],
})
export class MailModule {}
