import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderAccess } from 'src/db/order_access.entity';
import { Token } from 'src/db/token.entity';
import { OrdersTable } from 'src/db/orders_table.entity';
import { Sku_parameters } from 'src/db/sku_parameters.entity';

@Module({
    imports: [TypeOrmModule.forFeature([OrderAccess, Token, Sku_parameters, OrdersTable])],
    controllers: [OrdersController],
    providers: [OrdersService],
})
export class OrdersModule {}
