import {Module} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hierarchy } from 'src/db/hierarchy.entity';
import { Token } from 'src/db/token.entity';
import { Addresses } from 'src/db/addresses.entity';
import { PersonalController } from './personal.controller';
import { PersonalService } from './personal.service';
import { Personal_ls } from 'src/db/personal/personal_ls.entity';
import { Personal_ls_info } from 'src/db/personal/personal_ls_info.entity';
import { Personal_pos } from 'src/db/personal/personal_pos.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Token, Personal_ls, Personal_ls_info, Personal_pos])],
    controllers: [PersonalController],
    providers: [PersonalService],
})
export class PersonalModule {
}