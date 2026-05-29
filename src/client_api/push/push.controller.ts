import { Controller, Post, Delete, Get, Body, Headers } from '@nestjs/common';
import { PushService } from './push.service';
import { ClientAPIService } from '../client_api.service';

@Controller('client_api/push')
export class PushController {
    constructor(
        private pushService: PushService,
        private clientApiService: ClientAPIService,
    ) {}

    @Get('vapid-key')
    getVapidKey() {
        return { publicKey: this.pushService.getVapidPublicKey() };
    }

    @Post('subscribe')
    async subscribe(
        @Headers() headers: Record<string, string>,
        @Body() body: { endpoint: string; p256dh: string; auth: string },
    ) {
        const token = this.extractToken(headers);
        const check = await this.clientApiService.checkToken(token);
        if (check.status !== 'valid') return check;

        return this.pushService.subscribe(check.userId, body.endpoint, body.p256dh, body.auth);
    }

    @Delete('unsubscribe')
    async unsubscribe(
        @Headers() headers: Record<string, string>,
        @Body() body: { endpoint: string },
    ) {
        const token = this.extractToken(headers);
        const check = await this.clientApiService.checkToken(token);
        if (check.status !== 'valid') return check;

        return this.pushService.unsubscribe(check.userId, body.endpoint);
    }

    @Get('subscribers')
    async getSubscribers(@Headers() headers: Record<string, string>) {
        const token = this.extractToken(headers);
        const check = await this.clientApiService.checkToken(token);
        if (check.status !== 'valid') return check;
        if (!check.flags.includes('ADMIN')) return { status: 'forbidden' };

        const subscribers = await this.pushService.getSubscribers();
        return { status: 'success', data: subscribers };
    }

    @Post('send')
    async send(
        @Headers() headers: Record<string, string>,
        @Body() body: { hid?: number; title: string; body: string },
    ) {
        const token = this.extractToken(headers);
        const check = await this.clientApiService.checkToken(token);
        if (check.status !== 'valid') return check;
        if (!check.flags.includes('ADMIN')) return { status: 'forbidden' };

        if (body.hid) {
            return this.pushService.sendToHid(body.hid, body.title, body.body);
        }
        return this.pushService.sendToAll(body.title, body.body);
    }

    private extractToken(headers: Record<string, string>): string {
        const cookie = headers['cookie'] || '';
        const match = cookie.match(/auth_token=([^;]+)/);
        return match ? match[1] : '';
    }
}
