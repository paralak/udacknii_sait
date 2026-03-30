import {Body, Controller, Get, Head, Post, Query} from '@nestjs/common';
import { OtchetService } from './otchet.service';

@Controller('client_api/otchet')
export class OtchetController {
    constructor(private readonly personalService: OtchetService) {
    }

    @Get('get_months')
    getMonths(@Query('hid') hid: number) {
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
        return this.personalService.getMonths(hid);
    }

    @Get('get_prodaji_napitki_mes')
    getProdajiNapitkiMes(@Query('addr') addr: string) {
        if (!addr) {
            return {
                status: 'error',
                message: 'Адрес не предоставлен',
            };
        }
        return this.personalService.getProdajiNapitkiMes(addr);
    }
}