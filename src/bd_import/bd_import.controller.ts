import {Body, Controller, Get, Post} from '@nestjs/common';
import {Bd_importService} from './bd_import.service';
import {Headers} from '@nestjs/common';
import {UnauthorizedException} from '@nestjs/common';

@Controller('bd_import')
export class Bd_importController {
    constructor(private readonly bd_importService: Bd_importService) {
    }

    @Get()
    getHello(): string {
        return this.bd_importService.getHello();
    }

    @Get('get_codes_list')
    getCodesList() {
        return this.bd_importService.getCodes();
    }

    @Get('get_address_list')
    async getAddressList(@Headers() headers: Record<string, string>) {
        const token = headers['authorization']?.split(' ')[1];
        // Проверяем наличие токена в заголовках если его нет возвращаем ошибку и статус 401
        if (!token) {
            throw new UnauthorizedException('Токен не предоставлен');
        }
        const tokenCheck = await this.bd_importService.checkToken(token);
        if (tokenCheck.status === 'error') {
            throw new UnauthorizedException(tokenCheck.message);
        }
        if (tokenCheck.data !== 2) {
            throw new UnauthorizedException('Недостаточно прав');
        }
        return await this.bd_importService.getAddressList();
    }

    @Post('post_address')
    async getDatas(@Body() args: any, @Headers() headers: Record<string, string>) {
        const token = headers['authorization']?.split(' ')[1];
        // Проверяем наличие токена в заголовках если его нет возвращаем ошибку и статус 401
        if (!token) {
            throw new UnauthorizedException('Токен не предоставлен');
        }
        const tokenCheck = await this.bd_importService.checkToken(token);
        if (tokenCheck.status === 'error') {
            throw new UnauthorizedException(tokenCheck.message);
        }
        if (tokenCheck.data !== 2) {
            throw new UnauthorizedException('Недостаточно прав');
        }
        return this.bd_importService.sendAddressSums(args);
    }

    @Post('post_datas')
    sendDatas(@Body() args: any) {
        return this.bd_importService.sendDatas(args);
    }
}