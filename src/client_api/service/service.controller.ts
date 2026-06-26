import { Body, Controller } from '@nestjs/common';
import { Get, Headers, Post } from '@nestjs/common';
import { ServiceService } from './service.service';


@Controller('client_api/service')
export class ServiceController {
    constructor(private readonly serviceService: ServiceService) {}

    @Get('types')
    async getServiceTypes(@Headers() headers: Record<string, string>) {
        return this.serviceService.getServiceTypes(headers);
    }

    @Post('register')
    async registerService(@Headers() headers: Record<string, string>, @Body() body: { type: string; address: number; message: string }) {
        if (!body.type || !body.address || (!body.message && body.message !== '')) {
            return { status: 'error', message: 'Недостаточно данных для регистрации сервиса' };
        }
        return this.serviceService.regService(headers, body.address, body.type, body.message);
    }

    @Post('change_status')
    async changeServiceStatus(@Headers() headers: Record<string, string>, @Body() body: { regId: number; type: string; message: string; status: string }) {
        if (!body.regId || !body.type || (!body.message && body.message !== '') || !body.status) {
            return { status: 'error', message: 'Недостаточно данных для изменения статуса сервиса' };
        }
        return this.serviceService.changeServiceStatus(headers, body.regId, body.type, body.message, body.status);
    }

    @Post('reply')
    async replyToService(@Headers() headers: Record<string, string>, @Body() body: { regId: number; message: string }) {
        if (!body.regId || !body.message) {
            return { status: 'error', message: 'Недостаточно данных для ответа' };
        }
        return this.serviceService.replyToService(headers, body.regId, body.message);
    }

    @Get('list')
    async getServices(@Headers() headers: Record<string, string>) {
        return this.serviceService.getServices(headers);
    }

    @Get('my-list')
    async getMyServices(@Headers() headers: Record<string, string>) {
        return this.serviceService.getMyServices(headers);
    }
}
