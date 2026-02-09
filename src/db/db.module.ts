import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Item } from './item.entity';
import { Stock } from './stock.entity';
import { Peremesh } from './peremesh.entity';
import { Spisania } from './spisania.entity';
import { Sales } from './sales.entity';
import { Postavki } from './postavki.entity';
import { Token } from './token.entity';
import { Addresses } from './addresses.entity';
import { Hierarchy } from './hierarchy.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Item, Stock, Peremesh, Spisania, Sales, Postavki, Token, Addresses, Hierarchy])],
})
export class DBModule {}