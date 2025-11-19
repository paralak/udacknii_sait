import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Item } from './item.entity';
import { Stock } from './stock.entity';
import { Peremesh } from './peremesh.module';
import { Spisania } from './spisania.module';
import { Sales } from './sales.entity';
import { Postavki } from './postavki.module';

@Module({
  imports: [TypeOrmModule.forFeature([Item, Stock, Peremesh, Spisania, Sales, Postavki])]
})
export class DBModule {}