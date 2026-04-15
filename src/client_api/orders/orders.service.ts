import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { OrderAccess } from 'src/db/order_access.entity';
import { Token } from 'src/db/token.entity';
import { OrdersTable } from 'src/db/orders_table.entity';
import { Sku_parameters } from 'src/db/sku_parameters.entity';
import { ADDRESS_MAP, POSTAVSHIK_NAME } from './orders.constants';

@Injectable()
export class OrdersService {
    constructor(
        @InjectRepository(OrderAccess)
        private orderAccessRepository: Repository<OrderAccess>,

        @InjectRepository(Token)
        private tokenRepository: Repository<Token>,

        @InjectRepository(Sku_parameters)
        private skuParametersRepository: Repository<Sku_parameters>,
        
        @InjectRepository(OrdersTable)
        private ordersTableRepository: Repository<OrdersTable>,
    ) {}

    async checkToken(headers: Record<string, string>) {
        const cookieHeader = headers['cookie'];
        if (!cookieHeader) {
            return {
                status: 'error',
                message: 'Токен не предоставлен',
            };
        }

        const match = cookieHeader.match(/auth_token=([^;]+)/);
        if (!match) {
            return {
                status: 'error',
                message: 'Токен не предоставлен',
            };
        }

        const authToken = match[1];
        const token = await this.tokenRepository.findOne({ where: { token: authToken } });

        if (!token) {
            return {
                status: 'not_found',
                message: 'Токен не найден',
            };
        }

        const now = new Date();
        const expiredDate = new Date(token.expired);

        if (expiredDate < now) {
            return {
                status: 'expired',
                message: 'Токен истёк',
                expiredAt: token.expired,
            };
        }

        return {
            status: 'valid',
            message: 'Токен действителен',
            userId: token.user_id,
            expiresAt: token.expired,
        };
    }

    async getOrderAccess(orderId: string | undefined, headers: Record<string, string>) {
        const checkResponse = await this.checkToken(headers);
        if (checkResponse.status !== 'valid') {
            return checkResponse;
        }

        const criteria = orderId ? { order_id: orderId } : {};
        const records = await this.orderAccessRepository.find({ where: criteria });

        if (!records || records.length === 0) {
            return {
                status: 'error',
                message: 'Данные не найдены',
            };
        }

        return {
            status: 'success',
            data: records,
        };
    }

    // получить все заказы по диапозону дат, адресу и id заказа
    async getOrdersAddress(orderId: string, address: string, startDate: Date, endDate: Date, headers: Record<string, string>) {
        const checkResponse = await this.checkToken(headers);
        if (checkResponse.status !== 'valid') {
            return checkResponse;
        }
        const criteria: any = {};
        criteria.date = Between(startDate, endDate);
        criteria.address = address;
        criteria.order_id = orderId;
        const records = await this.ordersTableRepository.find({ where: criteria });

        if (!records || records.length === 0) {
            return {
                status: 'error',
                message: 'Данные не найдены',
            };
        }
        
        const result = records.map(record => {
            return {
                ...record,
                address: ADDRESS_MAP[record.address] || record.address,
            }
        });
        //нужно по product_id из orders_table найти название продукта, packaging_supplier в sku_parameters, для этого проходим по всем записям и добавляем новое поле product_name, если product_id нет в sku_parameters то добавляем product_name как unknown
        const skuParameters = await this.skuParametersRepository.find();
        const skuMap = {};
        skuParameters.forEach(sku => {
            skuMap[sku.sku_id] = [sku.packaging_supplier, sku.name];
        }
        );
        const finalResult = result.map(record => {
            return {
                ...record,
                product_name: skuMap[record.product_id] ? skuMap[record.product_id][1] : 'unknown',
                packaging_supplier: skuMap[record.product_id] ? skuMap[record.product_id][0] : 'unknown',
            }
        });
        const finalResultWithSupplier = finalResult.map(record => {
            return {
                ...record,
                supplier_name: POSTAVSHIK_NAME[record.supplier] || record.supplier,
            }
        });
        return {
            status: 'success',
            data: finalResultWithSupplier,
        };
    }

    // получить все заказы по диапозону дат, поставщику и id заказа
    async getOrdersSupplier(orderId: string, supplier: string, startDate: Date, endDate: Date, headers: Record<string, string>) {
        const checkResponse = await this.checkToken(headers);
        if (checkResponse.status !== 'valid') {
            return checkResponse;
        }
        const criteria: any = {};
        criteria.date = Between(startDate, endDate);
        criteria.supplier = supplier;
        criteria.order_id = orderId;
        const r = await this.ordersTableRepository.find({ where: criteria });

        if (!r || r.length === 0) {
            return {
                status: 'error',
                message: 'Данные не найдены',
            };
        }
        
        const result = r.map(record => {
            return {
                ...record,
                address: ADDRESS_MAP[record.address] || record.address,
            }
        });

        const skuParameters = await this.skuParametersRepository.find();
        const skuMap = {};
        skuParameters.forEach(sku => {
            skuMap[sku.sku_id] = [sku.packaging_supplier, sku.name];
        }
        );
        const finalResult = result.map(record => {
            return {
                ...record,
                product_name: skuMap[record.product_id] ? skuMap[record.product_id][1] : 'unknown',
                packaging_supplier: skuMap[record.product_id] ? skuMap[record.product_id][0] : 'unknown',
            }
        });
        const finalResultWithSupplier = finalResult.map(record => {
            return {
                ...record,
                supplier_name: POSTAVSHIK_NAME[record.supplier] || record.supplier,
            }
        });
        return {
            status: 'success',
            data: finalResultWithSupplier,
        };
    }

    async getAddressList(headers: Record<string, string>, orderId: string) {
        const checkResponse = await this.checkToken(headers);
        if (checkResponse.status !== 'valid') {
            return checkResponse;
        }
        //нужно вернуть список адресов по id заказа, для этого нужно найти все записи в orders_table с данным id заказа и вернуть уникальные адреса
        const records = await this.ordersTableRepository.find({ where: { order_id: orderId } });
        if (!records || records.length === 0) {
            return {
                status: 'error',
                message: 'Данные не найдены',
            };
        }
        //типизируем множество
        const addressSet: Set<string> = new Set();
        records.forEach(record => {
            addressSet.add(record.address);
        });
        //вернём и технические и человеческие названия адресов, для этого нужно пройти по множеству адресов и создать массив объектов address_id и address_name, для технического названия используем ключ из ADDRESS_MAP, для человеческого название используем значение из ADDRESS_MAP, если ключ не найден то используем само значение как техническое и человеческое название
        const addressList = Array.from(addressSet).map(address => {
            
            const addressName = ADDRESS_MAP[address] || address;
            return {
                address_id: address,
                address_name: addressName,
            };
        });

        return {
            status: 'success',
            data: addressList,
        };

    }

    async getSupplierList(headers: Record<string, string>, orderId: string) {
        const checkResponse = await this.checkToken(headers);
        if (checkResponse.status !== 'valid') {
            return checkResponse;
        }
        //нужно вернуть список поставщиков по id заказа, для этого нужно найти все записи в orders_table с данным id заказа и вернуть уникальные поставщики
        const records = await this.ordersTableRepository.find({ where: { order_id: orderId } });
        if (!records || records.length === 0) {
            return {
                status: 'error',
                message: 'Данные не найдены',
            };
        }
        const supplierSet: Set<string> = new Set();
        records.forEach(record => {
            supplierSet.add(record.supplier);
        });
        //вернём и технические и человеческие названия поставщиков, для этого нужно пройти по множеству поставщиков и создать массив объектов supplier_id и supplier_name, для технического названия используем ключ из POSTAVSHIK_NAME, для человеческого название используем значение из POSTAVSHIK_NAME, если ключ не найден то используем само значение как техническое и человеческое название
        const supplierList = Array.from(supplierSet).map(supplier => {
            const supplierName = POSTAVSHIK_NAME[supplier] || supplier;
            return {
                supplier_id: supplier,
                supplier_name: supplierName,
            };
        });

        return {
            status: 'success',
            data: supplierList,
        };
    }

}
