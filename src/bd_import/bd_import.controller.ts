import {Body, Controller, Get, Post} from '@nestjs/common';
import {Bd_importService} from './bd_import.service';

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

    @Post('post_datas')
    sendDatas(@Body() args: any) {
        return this.bd_importService.sendDatas(args);
    }
}