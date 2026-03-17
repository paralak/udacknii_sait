import {Module} from '@nestjs/common';
import {Bd_importController} from './bd_import.controller';
import {Bd_importService} from './bd_import.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Item } from 'src/db/item.entity';
import { Stock } from 'src/db/stock.entity';
import { Peremesh } from 'src/db/peremesh.entity';
import { Postavki } from 'src/db/postavki.entity';
import { Sales } from 'src/db/sales.entity';
import { Spisania } from 'src/db/spisania.entity';
import { Token } from 'src/db/token.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Item, Stock, Peremesh, Postavki, Sales, Spisania, Token])],
    controllers: [Bd_importController],
    providers: [Bd_importService],
})
export class Bd_importModule {
}
