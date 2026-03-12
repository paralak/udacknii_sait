import {Module} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { M_for_zarplati } from 'src/db/m_for_zarplati.entity';
import { ZarplatiController } from './zarplati.controller';
import { ZarplatiService } from './zarplati.service';
import { Token } from 'src/db/token.entity';
import { Hierarchy } from 'src/db/hierarchy.entity';
import { Ebal_cost } from 'src/db/ebal_cost.entity';
import { Ter_man_list } from 'src/db/ter_man_list.entity';
import { Month_for_zp } from 'src/db/month_for_zp.entity';

@Module({
    imports: [TypeOrmModule.forFeature([
        M_for_zarplati,
        Token,
        Hierarchy,
        Ebal_cost,
        Ter_man_list,
        Month_for_zp,
    ])],
    controllers: [ZarplatiController],
    providers: [ZarplatiService],
})
export class ZarplatiModule {
}