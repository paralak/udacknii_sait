import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Token } from 'src/db/token.entity';
import { ServiceService } from './service.service';
import { ServiceController } from './service.controller';
import { Service_log } from 'src/db/service_log.entity';
import { Service_reg } from 'src/db/service_reg.entity';
import { Service_types } from 'src/db/serice_types.entity';
import { Hierarchy } from 'src/db/hierarchy.entity';
import { PushSubscription } from 'src/db/push_subscription.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Token, Service_log, Service_reg, Service_types, Hierarchy, PushSubscription])],
    controllers: [ServiceController],
    providers: [ServiceService],
})
export class ServiceModule {}
