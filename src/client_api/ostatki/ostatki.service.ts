import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from 'src/db/token.entity';
import { Sku_parameters } from 'src/db/sku_parameters.entity';
import { Ostatki_fields } from 'src/db/ostatki_fields.entity';
import { Ostatki_reg } from 'src/db/ostatki_reg.entity';
import { Stock2 } from 'src/db/stock2.entity';

@Injectable()
export class OstatkiService {
    constructor(
        @InjectRepository(Token)
        private tokenRepository: Repository<Token>,
        @InjectRepository(Sku_parameters)
        private skuRepository: Repository<Sku_parameters>,
        @InjectRepository(Ostatki_reg)
        private ostatkiRegRepository: Repository<Ostatki_reg>,
        @InjectRepository(Ostatki_fields)
        private ostatkiFieldsRepository: Repository<Ostatki_fields>,
        @InjectRepository(Stock2)
        private stock2Repository: Repository<Stock2>,
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

    async getSkuBySkuId(skuId: number) {
        const sku = await this.skuRepository.findOne({ where: { sku_id: skuId } });
        return sku;
    }

    async getSkusBySkuIds(skuIds: number[]) {
        const skus = [];
        for (const skuId of skuIds) {
            const sku = await this.getSkuBySkuId(skuId);
            if (sku) {
                skus.push(sku);
            }
        }
        return skus;
    }

    async getRegList() {
        const regList = await this.ostatkiRegRepository.find();
        return regList;
    }

    async getFieldsByRegId(regId: number) {
        // Получаем все поля для данного regId из таблицы Ostatki_fields так же рекурсивно получаем parent для каждого поля и добавляем его в результат, избавляемся от повторений, преимущество у собственных полей, потом у полей родителей, потом у полей родителей родителей и так далее
        // сначала обрабатываем предка, не используем set, вместо этого используем словарь
        const reg = await this.ostatkiRegRepository.findOne({ where: { id: regId } });
        if (!reg) {
            return {};
        }
        let fields = {};
        if (reg.parent) {
            fields = await this.getFieldsByRegId(reg.parent);
        }
        const currentFields = await this.ostatkiFieldsRepository.find({ where: { ostatki_reg_id: regId } });
        for (const field of currentFields) {
            //если тип исключить то удаляем поле.
            if (field.type === 'exclude') {
                delete fields[field.sku_id];
                continue;
            }
            fields[field.sku_id] = field;
        }
        return fields;
    }

    async postStock(body: { address: number, sku_id: string, value: number, date: string }[]) {
        // body is array of objects with address, sku_id, value, date
        for (const item of body) {
            const stock = new Stock2();
            stock.address = item.address;
            stock.sku_id = item.sku_id;
            stock.value = item.value;
            stock.date = item.date;
            await this.stock2Repository.save(stock);
        }
        return {
            status: 'success',
            message: 'Данные успешно сохранены',
        };
    }
}
