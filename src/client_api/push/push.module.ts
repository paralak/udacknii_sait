import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { PushSubscription } from 'src/db/push_subscription.entity';
import { Hierarchy } from 'src/db/hierarchy.entity';
import { ClientAPIModule } from '../client_api.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([PushSubscription, Hierarchy]),
        ClientAPIModule,
    ],
    controllers: [PushController],
    providers: [PushService],
    exports: [PushService],
})
export class PushModule {}
