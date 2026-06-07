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
import { Stock2 } from 'src/db/stock2.entity';
import { ZakupRashodniki } from 'src/db/zakup_rashodniki.entity';

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

        @InjectRepository(Stock2)
        private stock2Repo: Repository<Stock2>,

        @InjectRepository(ZakupRashodniki)
        private zakupRepo: Repository<ZakupRashodniki>,
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
    private static readonly CALC_HORIZON_DAYS = 42; // месяц + 2 недели

    // Ближайшая дата доставки начиная с afterDate (не включительно), с учётом lead_time
    private getNextDeliveryAfter(deliveryDaysStr: string, leadTimeDays: number, afterDate: Date): Date | null {
        const deliveryDays = deliveryDaysStr
            .split(',')
            .map(s => parseInt(s.trim()))
            .filter(n => !isNaN(n) && n >= 0 && n <= 6);
        if (deliveryDays.length === 0) return null;

        const from = new Date(afterDate);
        from.setHours(0, 0, 0, 0);

        for (let i = 1; i <= 60; i++) {
            const d = new Date(from);
            d.setDate(from.getDate() + i);
            const systemDay = (d.getDay() + 6) % 7;
            if (deliveryDays.includes(systemDay)) {
                const deadline = new Date(d);
                deadline.setDate(d.getDate() - leadTimeDays);
                if (deadline >= from) return d;
            }
        }
        return null;
    }

    private getDeliveryDatesInPeriod(deliveryDaysStr: string, leadTimeDays: number, fromDate: Date): Date[] {
        const deliveryDays = deliveryDaysStr
            .split(',')
            .map(s => parseInt(s.trim()))
            .filter(n => !isNaN(n) && n >= 0 && n <= 6);

        if (deliveryDays.length === 0) return [];

        const today = new Date(fromDate);
        today.setHours(0, 0, 0, 0);

        const horizon = new Date(today);
        horizon.setDate(today.getDate() + CalculationService.CALC_HORIZON_DAYS);

        const result: Date[] = [];

        for (let i = 1; i <= CalculationService.CALC_HORIZON_DAYS + 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            if (d > horizon) break;

            const systemDay = (d.getDay() + 6) % 7;
            if (deliveryDays.includes(systemDay)) {
                const orderDeadline = new Date(d);
                orderDeadline.setDate(d.getDate() - leadTimeDays);
                if (orderDeadline >= today) {
                    result.push(new Date(d));
                }
            }
        }
        return result;
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

        // Загружаем актуальные цены из закупок (последняя запись на artikul)
        const priceRows: { artikul: string; price: number }[] = await this.zakupRepo.manager.query(
            `SELECT z.artikul, z.price FROM zakup_rashodniki_mes z
             INNER JOIN (SELECT artikul, MAX(timestamp) AS max_ts FROM zakup_rashodniki_mes GROUP BY artikul) m
             ON z.artikul = m.artikul AND z.timestamp = m.max_ts
             GROUP BY z.artikul, z.price`,
        );
        const artikulToPrice = new Map<string, number>(
            priceRows.map(r => [r.artikul, r.price]),
        );

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
            // Заказы этого адреса — собираем локально, затем делаем сводку
            const addrOrders: { supplier: string; supplierName: string; product_id: number; skuName: string; count: number; unit: string; date: Date; pricePerUnit?: number; packMult: number; orderMult: number; stockOur: number; nzVal: number }[] = [];

            // Пул всех позиций поставщика на этом адресе (для добора)
            type PoolItem = { product_id: number; skuName: string; unit: string; pricePerUnit?: number; packMult: number; orderMult: number; stockOur: number; dailyConsumption: number; nzVal: number; supplier: string; supplierName: string };
            const supplierPool = new Map<string, PoolItem[]>();

            if (itemSettings.length === 0) {
                logs.push({ level: 'warn', address: code, sku_id: 0, sku_name: '', message: 'Нет позиций в товарной матрице' });
                items_warn++;
                continue;
            }

            for (const item of itemSettings) {
                const sku = await this.skuParamsRepo.findOne({ where: { sku_id: item.sku_id } });
                const skuName = sku?.name_short || sku?.name || `SKU#${item.sku_id}`;
                const pricePerUnit = sku?.artikul ? artikulToPrice.get(sku.artikul) : undefined;

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

                // ── Симуляция по дням ──────────────────────────
                const dailyConsumption = rashodValue * (item.consumption_factor ?? 1);
                const orderMult = item.order_multiple ?? sku?.order_multiple ?? 1;

                // Текущий остаток из последней инвентаризации
                const stockRow = addr.hid
                    ? await this.stock2Repo.findOne({
                        where: { address: addr.hid, sku_id: String(item.sku_id) },
                        order: { date: 'DESC' },
                    })
                    : null;

                let stock = stockRow?.value ?? 0;
                const initialStock = stock;

                // Регистрируем в пуле поставщика для возможного добора
                if (!supplierPool.has(item.supplier_role)) supplierPool.set(item.supplier_role, []);
                supplierPool.get(item.supplier_role)!.push({ product_id: item.sku_id, skuName, unit: sku?.packaging_supplier || 'уп', pricePerUnit, packMult, orderMult, stockOur: initialStock, dailyConsumption, nzVal: item.nz, supplier: item.supplier_role, supplierName: supplier.supplier_name });
                const stockDate = stockRow?.date
                    ? new Date(stockRow.date).toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : null;

                if (!stockRow) {
                    logs.push({ level: 'warn', address: code, sku_id: item.sku_id, sku_name: skuName, message: `Нет данных об остатке — принято 0` });
                    items_warn++;
                }

                // Симуляция: pendingDeliveries[dateStr] = qty в наших единицах
                const pendingDeliveries = new Map<string, number>();
                const orderedDates = new Set<string>();
                const skuOrders: { date: Date; qty: number }[] = [];

                for (let day = 0; day <= CalculationService.CALC_HORIZON_DAYS; day++) {
                    const simDate = new Date(today);
                    simDate.setDate(today.getDate() + day);
                    const simDateStr = simDate.toISOString().split('T')[0];

                    // 1. Получаем заказы, прибывающие сегодня
                    if (pendingDeliveries.has(simDateStr)) {
                        stock += pendingDeliveries.get(simDateStr)!;
                        pendingDeliveries.delete(simDateStr);
                    }

                    // 2. Суточный расход
                    stock = Math.max(0, stock - dailyConsumption);

                    // 3. Нужен ли заказ?
                    if (stock < item.nz) {
                        const delivDate = this.getNextDeliveryAfter(supplier.delivery_days, leadTime, simDate);
                        if (delivDate) {
                            const delivDateStr = delivDate.toISOString().split('T')[0];
                            if (!orderedDates.has(delivDateStr)) {
                                orderedDates.add(delivDateStr);

                                // Следующая поставка после этой — для расчёта периода покрытия
                                const nextDeliv = this.getNextDeliveryAfter(supplier.delivery_days, leadTime, delivDate);
                                const coverDays = nextDeliv
                                    ? Math.round((nextDeliv.getTime() - delivDate.getTime()) / 86400000)
                                    : 7;

                                // Сколько будет в наличии на момент доставки
                                const daysToDeliv = Math.round((delivDate.getTime() - simDate.getTime()) / 86400000);
                                const stockAtDeliv = Math.max(0, stock - dailyConsumption * daysToDeliv);

                                // Заказываем: чтобы при доставке хватило до следующей поставки + НЗ
                                const targetStock = item.nz + dailyConsumption * coverDays;
                                const orderQtyOur = Math.max(0, targetStock - stockAtDeliv);
                                const orderQtySupplier = Math.ceil(orderQtyOur / packMult / orderMult) * orderMult;
                                const orderQtyOurRounded = orderQtySupplier * packMult;

                                // Добавляем доставку в симуляцию
                                pendingDeliveries.set(delivDateStr,
                                    (pendingDeliveries.get(delivDateStr) ?? 0) + orderQtyOurRounded);

                                skuOrders.push({ date: delivDate, qty: orderQtySupplier });

                                const ds = delivDate.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' });
                                logs.push({
                                    level: 'success', address: code, sku_id: item.sku_id, sku_name: skuName,
                                    message: `${ds}: ${orderQtySupplier} ${sku?.packaging_supplier || 'уп'} (остаток при доставке ~${stockAtDeliv.toFixed(1)}, покрытие ${coverDays}д, НЗ ${item.nz})`,
                                });
                            }
                        }
                    }
                }

                if (skuOrders.length === 0 && stock >= item.nz) {
                    const stockStr = stock.toFixed(1);
                    logs.push({
                        level: 'info', address: code, sku_id: item.sku_id, sku_name: skuName,
                        message: `Заказ не нужен — остаток ${stockStr} >= НЗ ${item.nz} на весь период${stockDate ? ` (остаток от ${stockDate})` : ''}`,
                    });
                }

                for (const o of skuOrders) {
                    pendingOrders.push({ address: code, supplier: item.supplier_role, product_id: item.sku_id, count: o.qty, date: o.date });
                    addrOrders.push({ supplier: item.supplier_role, supplierName: supplier.supplier_name, product_id: item.sku_id, skuName, count: o.qty, unit: sku?.packaging_supplier || 'уп', date: o.date, pricePerUnit, packMult: packMult, orderMult: orderMult, stockOur: initialStock, nzVal: item.nz });
                }
                items_ok++;
            }

            // ── Сводка по поставщикам для этого адреса ─────────
            if (addrOrders.length > 0) {
                // Группируем по supplier + date
                const grouped = new Map<string, typeof addrOrders>();
                for (const o of addrOrders) {
                    const key = `${o.supplier}__${o.date.toISOString().split('T')[0]}`;
                    if (!grouped.has(key)) grouped.set(key, []);
                    grouped.get(key)!.push(o);
                }

                // Для каждой группы — проверяем min_order_sum и выводим список позиций
                const supplierSettingsCache = new Map<string, SupplierSettings>();
                for (const [key, orders] of Array.from(grouped.entries()).sort()) {
                    const [supplierRole, dateStr] = key.split('__');
                    let suppSett = supplierSettingsCache.get(supplierRole);
                    if (!suppSett) {
                        suppSett = await this.supplierSettingsRepo.findOne({ where: { address_code: code, supplier_role: supplierRole } });
                        if (suppSett) supplierSettingsCache.set(supplierRole, suppSett);
                    }
                    const supplierLabel = suppSett?.supplier_name || supplierRole;
                    const dateFormatted = new Date(dateStr).toLocaleDateString('ru', { day: '2-digit', month: '2-digit' });
                    const minSum = suppSett?.min_order_sum;

                    let sumSuffix = '';
                    if (minSum) {
                        let totalSum = 0;
                        let missingPrices = 0;
                        for (const o of orders) {
                            if (o.pricePerUnit !== undefined) {
                                totalSum += o.count * o.pricePerUnit;
                            } else {
                                missingPrices++;
                            }
                        }

                        // Добор до минимальной суммы:
                        // берём ВСЕ позиции поставщика на этом адресе (не только те, что уже в заказе),
                        // выбираем позицию с наименьшим «осталось дней по расходу» = stockOur / dailyConsumption
                        if (missingPrices === 0 && totalSum > 0 && totalSum < minSum) {
                            const pool = (supplierPool.get(supplierRole) ?? [])
                                .filter(p => p.pricePerUnit !== undefined && p.orderMult > 0);
                            const initialSumBeforeTopup = totalSum;
                            const delivDate = new Date(dateStr);

                            // Локальная копия stockOur для симуляции добора
                            const poolStocks = new Map<number, number>(pool.map(p => [p.product_id, p.stockOur]));

                            while (totalSum < minSum && pool.length > 0) {
                                // «Дней запаса» = текущий_остаток / суточный_расход
                                // Для нулевого расхода — используем покрытие НЗ (× 30 для сопоставимости)
                                const target = pool.reduce((best, p) => {
                                    const s = poolStocks.get(p.product_id) ?? 0;
                                    const days = p.dailyConsumption > 0
                                        ? s / p.dailyConsumption
                                        : (p.nzVal > 0 ? (s / p.nzVal) * 30 : 999999);
                                    const bs = poolStocks.get(best.product_id) ?? 0;
                                    const bestDays = best.dailyConsumption > 0
                                        ? bs / best.dailyConsumption
                                        : (best.nzVal > 0 ? (bs / best.nzVal) * 30 : 999999);
                                    return days < bestDays ? p : best;
                                });

                                // Добавляем одну кратность заказа
                                const addedOur = target.orderMult * target.packMult;
                                poolStocks.set(target.product_id, (poolStocks.get(target.product_id) ?? 0) + addedOur);
                                const addedCost = target.orderMult * (target.pricePerUnit ?? 0);
                                totalSum += addedCost;

                                // Обновляем addrOrders (если позиция уже есть — увеличиваем count, иначе добавляем)
                                const existing = orders.find(o => o.product_id === target.product_id);
                                if (existing) {
                                    existing.count += target.orderMult;
                                } else {
                                    orders.push({ supplier: target.supplier, supplierName: target.supplierName, product_id: target.product_id, skuName: target.skuName, count: target.orderMult, unit: target.unit, date: delivDate, pricePerUnit: target.pricePerUnit, packMult: target.packMult, orderMult: target.orderMult, stockOur: target.stockOur, nzVal: target.nzVal });
                                }

                                // Синхронизируем pendingOrders
                                const pi = pendingOrders.findIndex(p =>
                                    p.address === code &&
                                    p.supplier === target.supplier &&
                                    p.product_id === target.product_id &&
                                    p.date.toISOString() === delivDate.toISOString(),
                                );
                                if (pi >= 0) {
                                    pendingOrders[pi].count += target.orderMult;
                                } else {
                                    pendingOrders.push({ address: code, supplier: target.supplier, product_id: target.product_id, count: target.orderMult, date: delivDate });
                                }
                            }

                            logs.push({
                                level: 'warn', address: code, sku_id: 0, sku_name: '',
                                message: `⚠️ Сумма ${initialSumBeforeTopup.toFixed(0)} ₽ < мин. ${minSum} ₽ — выполнен добор до ~${totalSum.toFixed(0)} ₽`,
                            });
                        }

                        if (missingPrices > 0) {
                            sumSuffix = ` | мин. сумма ${minSum} ₽ (цена не найдена для ${missingPrices} поз. — проверьте вручную)`;
                        } else if (totalSum < minSum) {
                            sumSuffix = ` | ⚠️ сумма ~${totalSum.toFixed(0)} ₽ < мин. ${minSum} ₽ (нет позиций для добора)`;
                        } else {
                            sumSuffix = ` | сумма ~${totalSum.toFixed(0)} ₽ ✓`;
                        }
                    }

                    const itemLinesAfterTopup = orders.map(o => `${o.skuName} ×${o.count} ${o.unit}`).join(', ');
                    logs.push({
                        level: 'info', address: code, sku_id: 0, sku_name: '',
                        message: `📦 ${supplierLabel} | ${dateFormatted} | ${orders.length} поз: ${itemLinesAfterTopup}${sumSuffix}`,
                    });
                }
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
