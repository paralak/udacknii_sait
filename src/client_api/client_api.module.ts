import {Module} from '@nestjs/common';
import {ClientAPIController} from './client_api.controller';
import {ClientAPIService} from './client_api.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hierarchy } from 'src/db/hierarchy.entity';
import { Token } from 'src/db/token.entity';
import { Adresses } from 'src/db/adresses.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Hierarchy, Token, Adresses])],
    controllers: [ClientAPIController],
    providers: [ClientAPIService],
})
export class ClientAPIModule {
}
