import { Controller, Get, Headers } from '@nestjs/common';
import { MailService } from './mail.service';

@Controller('client_api/mail')
export class MailController {
    constructor(private readonly mailService: MailService) {}

    @Get('credentials')
    async getCredentials(@Headers() headers: Record<string, string>) {
        const cookies = headers['cookie'];
        const token = cookies?.match(/auth_token=([^;]+)/)?.[1];
        if (!token) {
            return { status: 'error', message: 'Токен не предоставлен' };
        }

        const tokenCheck = await this.mailService.checkToken(token);
        if (tokenCheck.status === 'error') {
            return tokenCheck;
        }

        const hid = tokenCheck.data;
        return this.mailService.getMailCredentials(hid);
    }
}
