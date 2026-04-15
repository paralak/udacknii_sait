import { Controller, Get, Headers, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('client_api/orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    @Get('get_order_access')
    async getOrderAccess(
        @Headers() headers: Record<string, string>,
        @Query('order_id') orderId?: string,
    ) {
        return this.ordersService.getOrderAccess(orderId, headers);
    }

    @Get('get_address_list')
    async getAddressList(
        @Headers() headers: Record<string, string>,
        @Query('order_id') orderId: string,
    ) {
        if (!orderId) {
            return {
                status: 'error',
                message: 'ID заказа не предоставлен',
            };
        }
        return this.ordersService.getAddressList(headers, orderId);
    }

    @Get('get_supplier_list')
    async getSupplierList(
        @Headers() headers: Record<string, string>,
        @Query('order_id') orderId: string,
    ) {
        if (!orderId) {
            return {
                status: 'error',
                message: 'ID заказа не предоставлен',
            };
        }
        return this.ordersService.getSupplierList(headers, orderId);
    }


    @Get('get_orders_address')
    async getOrdersAddress(
        @Query('order_id') orderId: string,
        @Query('address') address: string,
        @Query('start_date') startDateStr: string,
        @Query('end_date') endDateStr: string,
        @Headers() headers: Record<string, string>,
    ) {
        // Валидация входных данных
        if (!orderId) {
            return {
                status: 'error',
                message: 'ID заказа не предоставлен',
            };
        }
        if (!address) {
            return {
                status: 'error',
                message: 'Адрес не предоставлен',
            };
        }
        if (!startDateStr || !endDateStr) {
            return {
                status: 'error',
                message: 'Дата начала и окончания не предоставлены',
            };
        }
        if (isNaN(Date.parse(startDateStr)) || isNaN(Date.parse(endDateStr))) {
            return {
                status: 'error',
                message: 'Неверный формат даты',
            };
        }
        const startDate = startDateStr ? new Date(startDateStr) : undefined;
        const endDate = endDateStr ? new Date(endDateStr) : undefined;
        return this.ordersService.getOrdersAddress(orderId, address, startDate, endDate, headers);
    }

    @Get('get_orders_supplier')
    async getOrdersSupplier(
        @Query('order_id') orderId: string,
        @Query('supplier') supplier: string,
        @Query('start_date') startDateStr: string,
        @Query('end_date') endDateStr: string,
        @Headers() headers: Record<string, string>,
    ) {
        // Валидация входных данных
        if (!orderId) {
            return {
                status: 'error',
                message: 'ID заказа не предоставлен',
            };
        }
        if (!supplier) {
            return {
                status: 'error',
                message: 'Поставщик не предоставлен',
            };
        }
        if (!startDateStr || !endDateStr) {
            return {
                status: 'error',
                message: 'Дата начала и окончания не предоставлены',
            };
        }
        if (isNaN(Date.parse(startDateStr)) || isNaN(Date.parse(endDateStr))) {
            return {
                status: 'error',
                message: 'Неверный формат даты',
            };
        }
        const startDate = startDateStr ? new Date(startDateStr) : undefined;
        const endDate = endDateStr ? new Date(endDateStr) : undefined;
        return this.ordersService.getOrdersSupplier(orderId, supplier, startDate, endDate, headers);
    }
}
