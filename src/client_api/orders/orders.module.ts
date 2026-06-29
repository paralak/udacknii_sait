import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CalculationService } from './calculation.service';
import { OrderAccess } from 'src/db/order_access.entity';
import { OrdersTable } from 'src/db/orders_table.entity';
import { Sku_parameters } from 'src/db/sku_parameters.entity';
import { AutoOrdersAddress } from 'src/db/auto_orders_address.entity';
import { SkuItemSettings } from 'src/db/sku_item_settings.entity';
import { SupplierSettings } from 'src/db/supplier_settings.entity';
import { SkuRashod } from 'src/db/sku_rashod.entity';
import { Flags } from 'src/db/flags.entity';
import { Stock2 } from 'src/db/stock2.entity';
import { ZakupRashodniki } from 'src/db/zakup_rashodniki.entity';

@Module({
    imports: [TypeOrmModule.forFeature([
        OrderAccess,
        Sku_parameters,
        OrdersTable,
        AutoOrdersAddress,
        SkuItemSettings,
        SupplierSettings,
        SkuRashod,
        Flags,
        Stock2,
        ZakupRashodniki,
    ])],
    controllers: [OrdersController],
    providers: [OrdersService, CalculationService],
})
export class OrdersModule {}
