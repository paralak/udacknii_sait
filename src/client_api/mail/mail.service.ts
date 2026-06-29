import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { verifyJwt } from 'src/auth/jwt.util';
import { MailCredentials } from 'src/db/mail_credentials.entity';

@Injectable()
export class MailService {
    constructor(
        @InjectRepository(MailCredentials)
        private mailCredentialsRepository: Repository<MailCredentials>,
    ) {}

    async checkToken(token: string) {
        const payload = verifyJwt(token);
        if (!payload) return { status: 'error', message: 'Недействительный токен' };
        return { status: 'success', data: payload.sub };
    }

    async getMailCredentials(hid: number) {
        const creds = await this.mailCredentialsRepository.findOne({ where: { hid } });
        if (!creds) {
            return { status: 'error', message: 'Почта не найдена' };
        }
        return { status: 'success', mail: creds.mail, password: creds.password };
    }
}
