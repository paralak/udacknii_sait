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
import { Personal_ls } from './personal/personal_ls.entity';
import { Personal_ls_info } from './personal/personal_ls_info.entity';
import { Personal_pos } from './personal/personal_pos.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    Item, 
    Stock, 
    Peremesh, 
    Spisania, 
    Sales, 
    Postavki, 
    Token, 
    Addresses, 
    Hierarchy,
    Personal_ls,
    Personal_ls_info,
    Personal_pos,
  ])],
})
export class DBModule {}