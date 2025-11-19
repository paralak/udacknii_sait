import {Controller, Get} from '@nestjs/common';
import {Bd_importService} from './bd_import.service';

@Controller('bd_import')
export class Bd_importController {
    constructor(private readonly Bd_importService: Bd_importService) {
    }

    @Get()
    getHello(): string {
        return this.Bd_importService.getHello();
    }

    @Get('get_codes_list')
    getCodesList() {
        return {
            codes: [
                123,
                321,
                222,
            ]
        }
    }
}