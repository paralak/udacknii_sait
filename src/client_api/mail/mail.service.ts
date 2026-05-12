import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from 'src/db/token.entity';
import { MailCredentials } from 'src/db/mail_credentials.entity';

@Injectable()
export class MailService {
    constructor(
        @InjectRepository(Token)
        private tokenRepository: Repository<Token>,

        @InjectRepository(MailCredentials)
        private mailCredentialsRepository: Repository<MailCredentials>,
    ) {}

    async checkToken(token: string) {
        const r = await this.tokenRepository.findOne({ where: { token } });
        if (!r) {
            return { status: 'error', message: 'Токен не найден' };
        }
        if (r.expired < new Date()) {
            return { status: 'error', message: 'Токен истёк' };
        }
        return { status: 'success', data: r.user_id };
    }

    async getMailCredentials(hid: number) {
        const creds = await this.mailCredentialsRepository.findOne({ where: { hid } });
        if (!creds) {
            return { status: 'error', message: 'Почта не найдена' };
        }
        return { status: 'success', mail: creds.mail, password: creds.password };
    }
}
