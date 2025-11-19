import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Item } from './item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Item])]
})
export class DBModule {}