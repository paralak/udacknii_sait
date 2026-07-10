import {Module} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalController } from './personal.controller';
import { PersonalService } from './personal.service';
import { Personal_ls } from 'src/db/personal/personal_ls.entity';
import { Personal_ls_info } from 'src/db/personal/personal_ls_info.entity';
import { Personal_pos } from 'src/db/personal/personal_pos.entity';
import { ManagerLsReport } from 'src/db/personal/manager_ls_report.entity';
import { VacationApplication } from 'src/db/personal/vacation_application.entity';
import { LsVacancy } from 'src/db/personal/ls_vacancy.entity';
import { LsEmployee } from 'src/db/personal/ls_employee.entity';
import { LsEmployeeVacation } from 'src/db/personal/ls_employee_vacation.entity';
import { Hierarchy } from 'src/db/hierarchy.entity';
import { Flags } from 'src/db/flags.entity';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Personal_ls,
            Personal_ls_info,
            Personal_pos,
            ManagerLsReport,
            VacationApplication,
            LsVacancy,
            LsEmployee,
            LsEmployeeVacation,
            Hierarchy,
            Flags,
        ]),
        MulterModule.register({ storage: memoryStorage() }),
    ],
    controllers: [PersonalController],
    providers: [PersonalService],
})
export class PersonalModule {
}
