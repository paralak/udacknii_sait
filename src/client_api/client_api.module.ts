import {Module} from '@nestjs/common';
import {ClientAPIController} from './client_api.controller';
import {ClientAPIService} from './client_api.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hierarchy } from 'src/db/hierarchy.entity';
import { Addresses } from 'src/db/addresses.entity';
import { Login } from 'src/db/login.entity';
import { Flags } from 'src/db/flags.entity';
import { UserProfile } from 'src/db/user_profile.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Hierarchy,
            Addresses,
            Login,
            Flags,
            UserProfile,
        ]),
    ],
    controllers: [ClientAPIController],
    providers: [ClientAPIService],
    exports: [ClientAPIService],
})
export class ClientAPIModule {
}

