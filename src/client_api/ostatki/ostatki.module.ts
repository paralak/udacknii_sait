import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OstatkiController } from './ostatki.controller';
import { OstatkiService } from './ostatki.service';
import { Token } from 'src/db/token.entity';
import { Sku_parameters } from 'src/db/sku_parameters.entity';
import { Ostatki_fields } from 'src/db/ostatki_fields.entity';
import { Ostatki_reg } from 'src/db/ostatki_reg.entity';
import { Stock2 } from 'src/db/stock2.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Token, Sku_parameters, Ostatki_reg, Ostatki_fields, Stock2])],
    controllers: [OstatkiController],
    providers: [OstatkiService],
})
export class OstatkiModule {}
