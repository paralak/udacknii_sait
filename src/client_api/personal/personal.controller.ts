import { Body, Controller, Get, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { PersonalService } from './personal.service';
import { Headers } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PersonalInfoDTO } from 'src/db/dto/personal_info.dto';
import { PersonalPosDTO } from 'src/db/dto/personal_pos.dto';
import { PersonalLsDTO } from 'src/db/dto/personal_ls.dto';

interface MulterFile {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}

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

    // ── LS Vacancies ──────────────────────────────────

    @Get('ls-vacancies')
    getLsVacancies(@Headers() headers: Record<string, string>) {
        return this.personalService.getLsVacancies(headers);
    }

    @Post('ls-vacancies/create')
    createLsVacancy(
        @Headers() headers: Record<string, string>,
        @Body() body: { internal_id: string; name: string; description?: string },
    ) {
        if (!body.internal_id?.trim()) return { status: 'error', message: 'Укажите внутренний ID' };
        if (!body.name?.trim()) return { status: 'error', message: 'Укажите название' };
        return this.personalService.createLsVacancy(headers, body.internal_id.trim(), body.name.trim(), body.description?.trim() || null);
    }

    @Post('ls-vacancies/update')
    updateLsVacancy(
        @Headers() headers: Record<string, string>,
        @Body() body: { id: number; internal_id: string; name: string; description?: string },
    ) {
        if (!body.id) return { status: 'error', message: 'Не указан ID' };
        if (!body.internal_id?.trim()) return { status: 'error', message: 'Укажите внутренний ID' };
        if (!body.name?.trim()) return { status: 'error', message: 'Укажите название' };
        return this.personalService.updateLsVacancy(headers, body.id, body.internal_id.trim(), body.name.trim(), body.description?.trim() || null);
    }

    @Get('ls-vacancies/delete')
    deleteLsVacancy(@Headers() headers: Record<string, string>, @Query('id') id: string) {
        if (!id || isNaN(Number(id))) return { status: 'error', message: 'Неверный ID' };
        return this.personalService.deleteLsVacancy(headers, Number(id));
    }

    @Get('manager/admin-view')
    getAdminManagerReport(@Headers() headers: Record<string, string>) {
        return this.personalService.getAdminManagerReport(headers);
    }

    @Get('manager/view-stores')
    getViewStores(@Headers() headers: Record<string, string>) {
        return this.personalService.getViewStores(headers);
    }

    @Get('manager/stores')
    getManagerStores(@Headers() headers: Record<string, string>) {
        return this.personalService.getManagerStores(headers);
    }

    @Post('manager/save-store')
    saveManagerStore(
        @Body() body: { store_hid: number; positions: any[] },
        @Headers() headers: Record<string, string>,
    ) {
        if (!body.store_hid || !Array.isArray(body.positions)) {
            return { status: 'error', message: 'Неверные данные' };
        }
        return this.personalService.saveManagerStore(body.store_hid, body.positions, headers);
    }

    @Get('vacations/gantt')
    getVacationsForGantt(
        @Headers() headers: Record<string, string>,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('all') all?: string,
    ) {
        return this.personalService.getVacationsForGantt(headers, from, to, all === 'true');
    }

    @Post('vacations/mark-original')
    markOriginalReceived(
        @Headers() headers: Record<string, string>,
        @Body() body: { lsid: string; received: boolean },
    ) {
        if (!body.lsid) return { status: 'error', message: 'Не указан сотрудник' };
        return this.personalService.markOriginalReceived(headers, body.lsid, !!body.received);
    }

    @Get('vacations/upcoming')
    getUpcomingVacations(@Headers() headers: Record<string, string>) {
        return this.personalService.getUpcomingVacations(headers);
    }

    @Get('vacations/employees')
    getMyStaffForVacations(@Headers() headers: Record<string, string>) {
        return this.personalService.getMyStaffForVacations(headers);
    }

    @Get('vacations/sample')
    getVacationSample() {
        return this.personalService.getVacationSample();
    }

    @Post('vacations/upload-sample')
    @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
    uploadVacationSample(
        @Headers() headers: Record<string, string>,
        @UploadedFile() file: MulterFile,
    ) {
        if (!file) return { status: 'error', message: 'Файл не загружен' };
        return this.personalService.uploadVacationSample(headers, file);
    }

    @Post('vacations/add-period')
    addVacationPeriod(
        @Headers() headers: Record<string, string>,
        @Body() body: { lsid: string; period: number; vacationStart: string; vacationEnd: string },
    ) {
        if (!body.lsid) return { status: 'error', message: 'Не указан сотрудник' };
        if (!body.vacationStart || !body.vacationEnd) return { status: 'error', message: 'Укажите даты отпуска' };
        return this.personalService.addVacationPeriod(
            headers,
            body.lsid,
            Number(body.period),
            body.vacationStart,
            body.vacationEnd,
        );
    }

    @Post('vacations/submit')
    @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
    submitVacationApplication(
        @Headers() headers: Record<string, string>,
        @Body() body: { employee_lsid: string; comment?: string },
        @UploadedFile() file: MulterFile | undefined,
    ) {
        if (!body.employee_lsid) return { status: 'error', message: 'Не указан сотрудник' };
        return this.personalService.submitVacationApplication(
            headers,
            body.employee_lsid,
            body.comment || null,
            file || null,
        );
    }

}