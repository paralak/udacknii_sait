import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Item } from './item.entity';
import { Stock } from './stock.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Item, Stock])]
})
export class DBModule {}