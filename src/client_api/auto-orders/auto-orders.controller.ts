import { Controller, Get, Put, Headers, Query, Body } from '@nestjs/common';
import { AutoOrdersService } from './auto-orders.service';

@Controller('client_api/auto-orders')
export class AutoOrdersController {
    constructor(private readonly autoOrdersService: AutoOrdersService) {}

    @Get('addresses')
    getAddresses(@Headers() headers: Record<string, string>) {
        return this.autoOrdersService.getAddresses(headers);
    }

    @Get('items')
    getItemSettings(
        @Query('address') address: string,
        @Headers() headers: Record<string, string>,
    ) {
        if (!address) return { status: 'error', message: 'address не указан' };
        return this.autoOrdersService.getItemSettings(address, headers);
    }

    @Put('items')
    updateItemSettings(
        @Query('address') address: string,
        @Query('sku_id') skuIdStr: string,
        @Body() body: any,
        @Headers() headers: Record<string, string>,
    ) {
        if (!address || !skuIdStr) {
            return { status: 'error', message: 'address и sku_id обязательны' };
        }
        const sku_id = parseInt(skuIdStr, 10);
        if (isNaN(sku_id)) return { status: 'error', message: 'Неверный sku_id' };

        const allowed = ['supplier_role', 'nz', 'max_stock', 'consumption_factor'];
        const updates: any = {};
        for (const key of allowed) {
            if (body[key] !== undefined) updates[key] = body[key];
        }

        return this.autoOrdersService.updateItemSettings(address, sku_id, updates, headers);
    }

    @Get('suppliers')
    getSupplierSettings(
        @Query('address') address: string,
        @Headers() headers: Record<string, string>,
    ) {
        if (!address) return { status: 'error', message: 'address не указан' };
        return this.autoOrdersService.getSupplierSettings(address, headers);
    }

    @Put('suppliers')
    updateSupplierSettings(
        @Query('address') address: string,
        @Query('supplier_role') supplierRole: string,
        @Body() body: any,
        @Headers() headers: Record<string, string>,
    ) {
        if (!address || !supplierRole) {
            return { status: 'error', message: 'address и supplier_role обязательны' };
        }

        const allowed = ['delivery_days', 'lead_time_days', 'min_order_sum', 'via_rc'];
        const updates: any = {};
        for (const key of allowed) {
            if (body[key] !== undefined) updates[key] = body[key];
        }

        return this.autoOrdersService.updateSupplierSettings(address, supplierRole, updates, headers);
    }
}
