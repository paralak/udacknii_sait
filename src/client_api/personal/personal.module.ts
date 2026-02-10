import {Module} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hierarchy } from 'src/db/hierarchy.entity';
import { Token } from 'src/db/token.entity';
import { Addresses } from 'src/db/addresses.entity';
import { PersonalController } from './personal.controller';
import { PersonalService } from './personal.service';

@Module({
    imports: [TypeOrmModule.forFeature([Hierarchy, Token, Addresses])],
    controllers: [PersonalController],
    providers: [PersonalService],
})
export class PersonalModule {
}