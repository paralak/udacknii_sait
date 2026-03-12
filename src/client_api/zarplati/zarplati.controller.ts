import {Body, Controller, Get, Head, Post, Query, Headers} from '@nestjs/common';
import { ZarplatiService } from './zarplati.service';


@Controller('client_api/zarplati')
export class ZarplatiController {
    constructor(private readonly zarplatiService: ZarplatiService) {
    }

    @Get('culc_ebal_cost')
    async culcEbalCost(@Query('month') month: string) {
        if (!month) {
            return {
                status: 'error',
                message: 'Месяц не предоставлен',
            };
        }
        let m = new Date(month);
        if (isNaN(m.getTime())) {
            return {
                status: 'error',
                message: 'Неверный формат месяца. Ожидается строка, распознаваемая конструктором Date.',
            };
        }
        return {
            status: 'success',
            data: await this.zarplatiService.culcEbalCost(m),
        };
    }

    @Get('summary')
    async getSummary(@Query('month') month: string, @Query('hid') hid: number) {
        if (!month) {
            return {
                status: 'error',
                message: 'Месяц не предоставлен',
            };
        }
        let m = new Date(month);
        if (isNaN(m.getTime())) {
            return {
                status: 'error',
                message: 'Неверный формат месяца. Ожидается строка, распознаваемая конструктором Date.',
            };
        }
        if (!hid) {
            return {
                status: 'error',
                message: 'HID не предоставлен',
            };
        }
        if (isNaN(Number(hid))) {
            return {
                status: 'error',
                message: 'HID должен быть числом',
            };
        }
        
        return await this.zarplatiService.getSummary(hid, m);
    }

    @Get('list')
    async getList(@Query('month') month: string) {
        if (!month) {
            return {
                status: 'error',
                message: 'Месяц не предоставлен',
            };
        }
        let m = new Date(month);
        if (isNaN(m.getTime())) {
            return {
                status: 'error',
                message: 'Неверный формат месяца. Ожидается строка, распознаваемая конструктором Date.',
            };
        }
        return await this.zarplatiService.getPersonesList(m);
    }

    @Get('month')
    async getMonth() {
        return this.zarplatiService.getMonth();
    }
}