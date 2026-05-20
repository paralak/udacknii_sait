import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutoOrdersController } from './auto-orders.controller';
import { AutoOrdersService } from './auto-orders.service';
import { Token } from 'src/db/token.entity';
import { Flags } from 'src/db/flags.entity';
import { AutoOrdersAddress } from 'src/db/auto_orders_address.entity';
import { SkuItemSettings } from 'src/db/sku_item_settings.entity';
import { SupplierSettings } from 'src/db/supplier_settings.entity';
import { Sku_parameters } from 'src/db/sku_parameters.entity';
import { SkuRashod } from 'src/db/sku_rashod.entity';

@Module({
    imports: [TypeOrmModule.forFeature([
        Token,
        Flags,
        AutoOrdersAddress,
        SkuItemSettings,
        SupplierSettings,
        Sku_parameters,
        SkuRashod,
    ])],
    controllers: [AutoOrdersController],
    providers: [AutoOrdersService],
})
export class AutoOrdersModule {}
