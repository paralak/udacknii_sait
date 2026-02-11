import {Body, Controller, Get, Head, Post, Query} from '@nestjs/common';
import { PersonalService } from './personal.service';
import {Headers} from '@nestjs/common';
import { PersonalInfoDTO } from 'src/db/dto/personal_info.dto';
import { PersonalPosDTO } from 'src/db/dto/personal_pos.dto';
import { PersonalLsDTO } from 'src/db/dto/personal_ls.dto';

@Controller('client_api/personal')
export class PersonalController {
    constructor(private readonly personalService: PersonalService) {
    }

    @Get('get_info')
    getInfo(@Query('lsid') id: string, @Headers() headers: Record<string, string>) {
        // Валидация ID на наличие и правильный формат (id начинается с ls и за ним следует число)
        if (!id) {
            return {
                status: 'error',
                message: 'ID не предоставлен',
            };
        }
        if (!/^ls\d+$/.test(id)) {
            return {
                status: 'error',
                message: 'ID должен начинаться с "ls" и содержать число',
            };
        }
        
        return this.personalService.getInfo(id, headers);
    }

    @Post('add_info')
    addInfo(@Body() personalInfoDTO: PersonalInfoDTO, @Headers() headers: Record<string, string>) {
        return this.personalService.addInfo(personalInfoDTO, headers);
    }

    @Post('update_info')
    updateInfo(@Body() personalInfoDTO: PersonalInfoDTO, @Headers() headers: Record<string, string>) {
        return this.personalService.updateInfo(personalInfoDTO, headers);
    }

    @Get('delete_info')
    deleteInfo(@Query('id') id: string, @Headers() headers: Record<string, string>) {
        if (!id) {
            return {
                status: 'error',
                message: 'ID не предоставлен',
            };
        }
        if (isNaN(Number(id))) {
            return {
                status: 'error',
                message: 'ID должен быть числом',
            };
        }
        let numericId = Number(id);
        if (numericId <= 0) {
            return {
                status: 'error',
                message: 'ID должен быть положительным числом',
            };
        }

        return this.personalService.deleteInfo(numericId, headers);
    }

    @Get('get_pos')
    getPos(@Query('hid') hid: string, @Headers() headers: Record<string, string>) {
        // Валидация hid на наличие и правильный формат (id число)
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
        let numericHid = Number(hid);
        if (numericHid <= 0) {
            return {
                status: 'error',
                message: 'HID должен быть положительным числом',
            };
        }
        return this.personalService.getPos(numericHid, headers);
    }

    @Get('get_all_pos')
    getAllPos(@Headers() headers: Record<string, string>) {
        return this.personalService.getAllPos(headers);
    }

    @Post('update_pos')
    updatePos(@Body() pos: PersonalPosDTO, @Headers() headers: Record<string, string>) {
        // используем ДТО валидация не нужна 
        return this.personalService.updatePos(pos, headers);
    }

    @Post('add_pos')
    addPos(@Body() pos: PersonalPosDTO, @Headers() headers: Record<string, string>) {
        // используем ДТО валидация не нужна 
        return this.personalService.addPos(pos, headers);
    }

    @Get('delete_pos')
    deletePos(@Query('id') id: string, @Headers() headers: Record<string, string>) {
        if (!id) {
            return {
                status: 'error',
                message: 'ID не предоставлен',
            };
        }
        if (isNaN(Number(id))) {
            return {
                status: 'error',
                message: 'ID должен быть числом',
            };
        }
        let numericId = Number(id);
        if (numericId <= 0) {
            return {
                status: 'error',
                message: 'ID должен быть положительным числом',
            };
        }
        return this.personalService.deletePos(numericId, headers);
    }

    @Get('get_ls')
    getLs(@Query('lsid') lsid: string, @Headers() headers: Record<string, string>) {
        // Валидация lsid на наличие и правильный формат (id начинается с ls и за ним следует число)
        if (!lsid) {
            return {
                status: 'error',
                message: 'LSID не предоставлен',
            };
        }
        if (!/^ls\d+$/.test(lsid)) {
            return {
                status: 'error',
                message: 'LSID должен начинаться с "ls" и содержать число',
            };
        }
        return this.personalService.getLs(lsid, headers);
    }

    @Get('get_all_ls')
    getAllLs(@Headers() headers: Record<string, string>) {
        return this.personalService.getAllLs(headers);
    }

    @Post('add_ls')
    addLs(@Body() ls: PersonalLsDTO, @Headers() headers: Record<string, string>) {
        // используем ДТО валидация не нужна 
        return this.personalService.addLs(ls, headers);
    }

    @Post('update_ls')
    updateLs(@Body() ls: PersonalLsDTO, @Headers() headers: Record<string, string>) {
        // используем ДТО валидация не нужна 
        return this.personalService.updateLs(ls, headers);
    }

    @Get('delete_ls')
    deleteLs(@Query('lsid') lsid: string, @Headers() headers: Record<string, string>) {
        // Валидация lsid на наличие и правильный формат (id начинается с ls и за ним следует число)
        if (!lsid) {
            return {
                status: 'error',
                message: 'LSID не предоставлен',
            };
        }
        if (!/^ls\d+$/.test(lsid)) {
            return {
                status: 'error',
                message: 'LSID должен начинаться с "ls" и содержать число',
            };
        }
        return this.personalService.deleteLs(lsid, headers);
    }

}