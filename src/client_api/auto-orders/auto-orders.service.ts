import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from 'src/db/token.entity';
import { Flags } from 'src/db/flags.entity';
import { AutoOrdersAddress } from 'src/db/auto_orders_address.entity';
import { SkuItemSettings } from 'src/db/sku_item_settings.entity';
import { SupplierSettings } from 'src/db/supplier_settings.entity';
import { Sku_parameters } from 'src/db/sku_parameters.entity';

@Injectable()
export class AutoOrdersService {
    constructor(
        @InjectRepository(Token)
        private tokenRepository: Repository<Token>,

        @InjectRepository(Flags)
        private flagsRepository: Repository<Flags>,

        @InjectRepository(AutoOrdersAddress)
        private addressRepository: Repository<AutoOrdersAddress>,

        @InjectRepository(SkuItemSettings)
        private skuItemSettingsRepository: Repository<SkuItemSettings>,

        @InjectRepository(SupplierSettings)
        private supplierSettingsRepository: Repository<SupplierSettings>,

        @InjectRepository(Sku_parameters)
        private skuParametersRepository: Repository<Sku_parameters>,
    ) {}

    async checkToken(headers: Record<string, string>) {
        const cookieHeader = headers['cookie'];
        if (!cookieHeader) {
            return { status: 'error', message: 'Токен не предоставлен' };
        }

        const match = cookieHeader.match(/auth_token=([^;]+)/);
        if (!match) {
            return { status: 'error', message: 'Токен не предоставлен' };
        }

        const authToken = match[1];
        const token = await this.tokenRepository.findOne({ where: { token: authToken } });

        if (!token) {
            return { status: 'not_found', message: 'Токен не найден' };
        }

        if (new Date(token.expired) < new Date()) {
            return { status: 'expired', message: 'Токен истёк' };
        }

        return { status: 'valid', userId: token.user_id };
    }

    /** Возвращает allowed address_codes для пользователя.
     *  ADMIN видит все, TM_{hid} — только свой адрес, TM_AUTOZAKAZI — все. */
    private async getAllowedAddresses(userId: number): Promise<string[] | 'all'> {
        const userFlags = await this.flagsRepository.find({ where: { hid: userId } });
        const flagValues = userFlags.map(f => f.flag);

        if (flagValues.includes('ADMIN')) return 'all';
        if (!flagValues.includes('TM_AUTOZAKAZI')) return [];

        // Ищем TM_{hid} флаги
        const tmFlags = flagValues.filter(f => f.startsWith('TM_') && f !== 'TM_AUTOZAKAZI');
        if (tmFlags.length === 0) return 'all'; // TM_AUTOZAKAZI без привязки = все

        // Находим address_code по hid
        const hids = tmFlags.map(f => parseInt(f.replace('TM_', ''), 10)).filter(n => !isNaN(n));
        const addresses = await this.addressRepository
            .createQueryBuilder('a')
            .where('a.hid IN (:...hids)', { hids })
            .getMany();

        return addresses.map(a => a.address_code);
    }

    async getAddresses(headers: Record<string, string>) {
        const check = await this.checkToken(headers);
        if (check.status !== 'valid') return check;

        const allowed = await this.getAllowedAddresses(check.userId);
        const qb = this.addressRepository.createQueryBuilder('a').orderBy('a.address_code');
        if (allowed !== 'all' && allowed.length > 0) {
            qb.where('a.address_code IN (:...codes)', { codes: allowed });
        } else if (allowed !== 'all') {
            return { status: 'forbidden', message: 'Нет доступа' };
        }

        const data = await qb.getMany();
        return { status: 'success', data };
    }

    async getItemSettings(address: string, headers: Record<string, string>) {
        const check = await this.checkToken(headers);
        if (check.status !== 'valid') return check;

        const allowed = await this.getAllowedAddresses(check.userId);
        if (allowed !== 'all' && !allowed.includes(address)) {
            return { status: 'forbidden', message: 'Нет доступа к данному адресу' };
        }

        const settings = await this.skuItemSettingsRepository.find({
            where: { address_code: address },
        });

        // Обогащаем названиями SKU
        const skuIds = [...new Set(settings.map(s => s.sku_id))];
        const skus = skuIds.length
            ? await this.skuParametersRepository
                  .createQueryBuilder('s')
                  .where('s.sku_id IN (:...ids)', { ids: skuIds })
                  .getMany()
            : [];
        const skuMap = Object.fromEntries(skus.map(s => [s.sku_id, s]));

        const data = settings.map(s => ({
            ...s,
            sku_name: skuMap[s.sku_id]?.name ?? null,
            sku_name_short: skuMap[s.sku_id]?.name_short ?? null,
            packaging: skuMap[s.sku_id]?.packaging ?? null,
        }));

        return { status: 'success', data };
    }

    async updateItemSettings(
        address: string,
        sku_id: number,
        updates: Partial<Pick<SkuItemSettings, 'supplier_role' | 'nz' | 'max_stock' | 'consumption_factor' | 'order_multiple' | 'packaging_multiple'>>,
        headers: Record<string, string>,
    ) {
        const check = await this.checkToken(headers);
        if (check.status !== 'valid') return check;

        const allowed = await this.getAllowedAddresses(check.userId);
        if (allowed !== 'all' && !allowed.includes(address)) {
            return { status: 'forbidden', message: 'Нет доступа к данному адресу' };
        }

        const record = await this.skuItemSettingsRepository.findOne({
            where: { address_code: address, sku_id },
        });

        if (!record) {
            return { status: 'error', message: 'Запись не найдена' };
        }

        // Валидация consumption_factor
        if (updates.consumption_factor !== undefined) {
            const valid = [0.8, 0.9, 1.0, 1.1, 1.2];
            const rounded = Math.round(updates.consumption_factor * 10) / 10;
            if (!valid.includes(rounded)) {
                return { status: 'error', message: 'consumption_factor должен быть одним из: 0.8, 0.9, 1.0, 1.1, 1.2' };
            }
            updates.consumption_factor = rounded;
        }

        Object.assign(record, updates);
        await this.skuItemSettingsRepository.save(record);

        return { status: 'success', data: record };
    }

    async getSupplierSettings(address: string, headers: Record<string, string>) {
        const check = await this.checkToken(headers);
        if (check.status !== 'valid') return check;

        const allowed = await this.getAllowedAddresses(check.userId);
        if (allowed !== 'all' && !allowed.includes(address)) {
            return { status: 'forbidden', message: 'Нет доступа к данному адресу' };
        }

        const data = await this.supplierSettingsRepository.find({
            where: { address_code: address },
            order: { supplier_name: 'ASC' },
        });

        return { status: 'success', data };
    }

    async updateSupplierSettings(
        address: string,
        supplier_role: string,
        updates: Partial<Pick<SupplierSettings, 'delivery_days' | 'lead_time_days' | 'min_order_sum' | 'via_rc'>>,
        headers: Record<string, string>,
    ) {
        const check = await this.checkToken(headers);
        if (check.status !== 'valid') return check;

        const allowed = await this.getAllowedAddresses(check.userId);
        if (allowed !== 'all' && !allowed.includes(address)) {
            return { status: 'forbidden', message: 'Нет доступа к данному адресу' };
        }

        const record = await this.supplierSettingsRepository.findOne({
            where: { address_code: address, supplier_role },
        });

        if (!record) {
            return { status: 'error', message: 'Поставщик не найден' };
        }

        Object.assign(record, updates);
        await this.supplierSettingsRepository.save(record);

        return { status: 'success', data: record };
    }
}
