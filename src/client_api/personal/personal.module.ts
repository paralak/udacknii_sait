import {Module} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalController } from './personal.controller';
import { PersonalService } from './personal.service';
import { Personal_ls } from 'src/db/personal/personal_ls.entity';
import { Personal_ls_info } from 'src/db/personal/personal_ls_info.entity';
import { Personal_pos } from 'src/db/personal/personal_pos.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Personal_ls, Personal_ls_info, Personal_pos])],
    controllers: [PersonalController],
    providers: [PersonalService],
})
export class PersonalModule {
}