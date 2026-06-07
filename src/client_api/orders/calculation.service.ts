import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutoOrdersAddress } from 'src/db/auto_orders_address.entity';
import { SkuItemSettings } from 'src/db/sku_item_settings.entity';
import { SupplierSettings } from 'src/db/supplier_settings.entity';
import { SkuRashod } from 'src/db/sku_rashod.entity';
import { Sku_parameters } from 'src/db/sku_parameters.entity';
import { OrdersTable } from 'src/db/orders_table.entity';
import { Token } from 'src/db/token.entity';
import { Flags } from 'src/db/flags.entity';

export interface CalcLogEntry {
    level: 'info' | 'warn' | 'error' | 'success';
    address: string;
    sku_id: number;
    sku_name: string;
    message: string;
}

export interface CalcSummary {
    addresses: number;
    items_ok: number;
    items_warn: number;
    items_error: number;
}

export interface CalcResult {
    logs: CalcLogEntry[];
    ordersCreated: number;
    orderId: string | null;
    summary: CalcSummary;
}

@Injectable()
export class CalculationService {
    constructor(
        @InjectRepository(AutoOrdersAddress)
        private addressRepo: Repository<AutoOrdersAddress>,

        @InjectRepository(SkuItemSettings)
        private itemSettingsRepo: Repository<SkuItemSettings>,

        @InjectRepository(SupplierSettings)
        private supplierSettingsRepo: Repository<SupplierSettings>,

        @InjectRepository(SkuRashod)
        private rashodRepo: Repository<SkuRashod>,

        @InjectRepository(Sku_parameters)
        private skuParamsRepo: Repository<Sku_parameters>,

        @InjectRepository(OrdersTable)
        private ordersTableRepo: Repository<OrdersTable>,

        @InjectRepository(Token)
        private tokenRepo: Repository<Token>,

        @InjectRepository(Flags)
        private flagsRepo: Repository<Flags>,
    ) {}

    async checkToken(headers: Record<string, string>): Promise<{ status: string; userId?: number; message?: string }> {
        const match = headers['cookie']?.match(/auth_token=([^;]+)/);
        if (!match) return { status: 'error', message: 'Токен не предоставлен' };
        const token = await this.tokenRepo.findOne({ where: { token: match[1] } });
        if (!token) return { status: 'error', message: 'Токен не найден' };
        if (new Date(token.expired) < new Date()) return { status: 'error', message: 'Токен истёк' };
        return { status: 'valid', userId: token.user_id };
    }

    async isAdmin(hid: number): Promise<boolean> {
        const flag = await this.flagsRepo.findOne({ where: { hid, flag: 'ADMIN' } });
        return !!flag;
    }

    // delivery_days хранится как 0=Пн...6=Вс
    // JS Date.getDay() возвращает 0=Вс...6=Сб
    // Конвертация: systemDay = (jsDay + 6) % 7
    private getNextDeliveryDate(deliveryDaysStr: string, leadTimeDays: number, fromDate: Date): Date | null {
        const deliveryDays = deliveryDaysStr
            .split(',')
            .map(s => parseInt(s.trim()))
            .filter(n => !isNaN(n) && n >= 0 && n <= 6);

        if (deliveryDays.length === 0) return null;

        const today = new Date(fromDate);
        today.setHours(0, 0, 0, 0);

        for (let i = 1; i <= 60; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const systemDay = (d.getDay() + 6) % 7; // конвертация из JS в систему
            if (deliveryDays.includes(systemDay)) {
                // Дедлайн заказа: за lead_time_days до доставки
                const orderDeadline = new Date(d);
                orderDeadline.setDate(d.getDate() - leadTimeDays);
                if (orderDeadline >= today) {
                    return d;
                }
            }
        }
        return null;
    }

    async calculate(dryRun: boolean, headers: Record<string, string>): Promise<CalcResult> {
        // Авторизация
        const check = await this.checkToken(headers);
        if (check.status !== 'valid') {
            return {
                logs: [{ level: 'error', address: '', sku_id: 0, sku_name: '', message: check.message }],
                ordersCreated: 0,
                orderId: null,
                summary: { addresses: 0, items_ok: 0, items_warn: 0, items_error: 1 },
            };
        }
        if (!(await this.isAdmin(check.userId))) {
            return {
                logs: [{ level: 'error', address: '', sku_id: 0, sku_name: '', message: 'Доступ только для ADMIN' }],
                ordersCreated: 0,
                orderId: null,
                summary: { addresses: 0, items_ok: 0, items_warn: 0, items_error: 1 },
            };
        }

        const logs: CalcLogEntry[] = [];
        const pendingOrders: { address: string; supplier: string; product_id: number; count: number; date: Date }[] = [];
        let items_ok = 0, items_warn = 0, items_error = 0;
        const today = new Date();

        const addresses = await this.addressRepo.find({ order: { address_code: 'ASC' } });

        logs.push({
            level: 'info', address: '', sku_id: 0, sku_name: '',
            message: `Запуск расчёта ${dryRun ? '(пробный, без сохранения)' : '(с сохранением в БД)'} — ${today.toLocaleString('ru')}`,
        });

        for (const addr of addresses) {
            const code = addr.address_code;
            logs.push({
                level: 'info', address: code, sku_id: 0, sku_name: '',
                message: `━━━ Адрес ${code}: ${addr.name} ━━━`,
            });

            const itemSettings = await this.itemSettingsRepo.find({ where: { address_code: code } });

            if (itemSettings.length === 0) {
                logs.push({ level: 'warn', address: code, sku_id: 0, sku_name: '', message: 'Нет позиций в товарной матрице' });
                items_warn++;
                continue;
            }

            for (const item of itemSettings) {
                const sku = await this.skuParamsRepo.findOne({ where: { sku_id: item.sku_id } });
                const skuName = sku?.name_short || sku?.name || `SKU#${item.sku_id}`;

                // ── Проверка 1: расход ──────────────────────────
                const rashod = await this.rashodRepo.findOne({ where: { address: code, item: item.sku_id } });
                const rashodValue = rashod?.value ?? 0;
                if (!rashod) {
                    logs.push({ level: 'warn', address: code, sku_id: item.sku_id, sku_name: skuName, message: 'Нет данных о суточном расходе — принято 0' });
                    items_warn++;
                }

                // ── Проверка 2: НЗ ─────────────────────────────
                if (item.nz === null || item.nz === undefined) {
                    logs.push({ level: 'error', address: code, sku_id: item.sku_id, sku_name: skuName, message: 'НЗ (минимальный запас) не задан' });
                    items_error++;
                    continue;
                }

                // ── Проверка 3: поставщик ──────────────────────
                if (!item.supplier_role) {
                    logs.push({ level: 'error', address: code, sku_id: item.sku_id, sku_name: skuName, message: 'Поставщик не назначен' });
                    items_error++;
                    continue;
                }

                // ── Проверка 4: настройки поставщика ──────────
                const supplier = await this.supplierSettingsRepo.findOne({
                    where: { address_code: code, supplier_role: item.supplier_role },
                });
                if (!supplier) {
                    logs.push({ level: 'error', address: code, sku_id: item.sku_id, sku_name: skuName, message: `Нет настроек поставщика «${item.supplier_role}» для этого адреса` });
                    items_error++;
                    continue;
                }

                // ── Проверка 5: дни доставки ───────────────────
                if (!supplier.delivery_days || supplier.delivery_days.trim() === '') {
                    logs.push({ level: 'error', address: code, sku_id: item.sku_id, sku_name: skuName, message: `Поставщик «${supplier.supplier_name}»: не заданы дни доставки` });
                    items_error++;
                    continue;
                }

                // ── Проверка 6: срок поставки ──────────────────
                const leadTime = supplier.lead_time_days ?? 0;
                if (supplier.lead_time_days === null || supplier.lead_time_days === undefined) {
                    logs.push({ level: 'warn', address: code, sku_id: item.sku_id, sku_name: skuName, message: `Поставщик «${supplier.supplier_name}»: срок поставки не задан — принято 0 дней` });
                    items_warn++;
                }

                // ── Проверка 7: коэффициент упаковки ──────────
                const packMult = item.packaging_multiple ?? sku?.packaging_multiple;
                if (!packMult || packMult <= 0) {
                    logs.push({ level: 'error', address: code, sku_id: item.sku_id, sku_name: skuName, message: `Не задан коэффициент упаковки (packaging_multiple)` });
                    items_error++;
                    continue;
                }

                // ── Расчёт ─────────────────────────────────────
                const nextDelivery = this.getNextDeliveryDate(supplier.delivery_days, leadTime, today);
                if (!nextDelivery) {
                    logs.push({ level: 'error', address: code, sku_id: item.sku_id, sku_name: skuName, message: `Не удалось определить ближайшую дату доставки` });
                    items_error++;
                    continue;
                }

                const dailyConsumption = rashodValue * (item.consumption_factor ?? 1);
                // Нужно покрыть: НЗ + потребление за период (lead_time + запас на 1 неделю)
                const coverDays = leadTime + 7;
                const neededOurUnits = item.nz + dailyConsumption * coverDays;
                const neededSupplierUnits = neededOurUnits / packMult;
                const orderMult = item.order_multiple ?? sku?.order_multiple ?? 1;
                const finalQty = Math.max(1, Math.ceil(neededSupplierUnits / orderMult) * orderMult);

                const deliveryDateStr = nextDelivery.toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: 'numeric' });
                logs.push({
                    level: 'success',
                    address: code,
                    sku_id: item.sku_id,
                    sku_name: skuName,
                    message: `${finalQty} ${sku?.packaging_supplier || 'уп'} → ${supplier.supplier_name} (доставка ${deliveryDateStr}) | расход: ${dailyConsumption.toFixed(2)}/день, НЗ: ${item.nz}, lead_time: ${leadTime}д, упаковка: ×${packMult}`,
                });
                items_ok++;

                pendingOrders.push({
                    address: code,
                    supplier: item.supplier_role,
                    product_id: item.sku_id,
                    count: finalQty,
                    date: nextDelivery,
                });
            }
        }

        // ── Итог ───────────────────────────────────────────────
        logs.push({
            level: 'info', address: '', sku_id: 0, sku_name: '',
            message: `━━━ Итог: ✅ ${items_ok} OK  ⚠️ ${items_warn} предупреждений  ❌ ${items_error} ошибок ━━━`,
        });

        let orderId: string | null = null;
        let ordersCreated = 0;

        if (!dryRun && pendingOrders.length > 0) {
            const now = new Date();
            orderId = `calc_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

            for (const o of pendingOrders) {
                const row = this.ordersTableRepo.create({ ...o, order_id: orderId });
                await this.ordersTableRepo.save(row);
                ordersCreated++;
            }

            logs.push({
                level: 'success', address: '', sku_id: 0, sku_name: '',
                message: `✅ Сохранено ${ordersCreated} позиций. ID заказа: ${orderId}`,
            });
        }

        return {
            logs,
            ordersCreated,
            orderId,
            summary: { addresses: addresses.length, items_ok, items_warn, items_error },
        };
    }
}
