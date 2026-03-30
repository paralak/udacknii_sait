import {Module} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtchetController } from './otchet.controller';
import { OtchetService } from './otchet.service';
import { M_for_zarplati } from 'src/db/m_for_zarplati.entity';
import { Prodaji_napitki_mes } from 'src/db/prodaji_napitki_mes.entity';

@Module({
    imports: [TypeOrmModule.forFeature([
        M_for_zarplati,
        Prodaji_napitki_mes,
    ])],
    controllers: [OtchetController],
    providers: [OtchetService],
})
export class OtchetModule {
}