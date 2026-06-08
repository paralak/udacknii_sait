import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutoOrdersAddress } from 'src/db/auto_orders_address.entity';
import { OrderAccess } from 'src/db/order_access.entity';
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

interface ValidItem {
    sku_id: number;
    skuName: string;
    unit: string;
    pricePerUnit?: number;
    packMult: number;
    orderMult: number;
    dailyConsumption: number;
    nzVal: number;
    initialStock: number;
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

        @InjectRepository(OrderAccess)
        private orderAccessRepo: Repository<OrderAccess>,
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
    private static readonly CALC_HORIZON_DAYS = 42;

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

    async calculate(dryRun: boolean, headers: Record<string, string>): Promise<CalcResult> {
        const check = await this.checkToken(headers);
        if (check.status !== 'valid') {
            return { logs: [{ level: 'error', address: '', sku_id: 0, sku_name: '', message: check.message }], ordersCreated: 0, orderId: null, summary: { addresses: 0, items_ok: 0, items_warn: 0, items_error: 1 } };
        }
        if (!(await this.isAdmin(check.userId))) {
            return { logs: [{ level: 'error', address: '', sku_id: 0, sku_name: '', message: 'Доступ только для ADMIN' }], ordersCreated: 0, orderId: null, summary: { addresses: 0, items_ok: 0, items_warn: 0, items_error: 1 } };
        }

        const logs: CalcLogEntry[] = [];
        const pendingOrders: { address: string; supplier: string; product_id: number; count: number; date: Date }[] = [];
        let items_ok = 0, items_warn = 0, items_error = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const priceRows: { artikul: string; price: number }[] = await this.zakupRepo.manager.query(
            `SELECT z.artikul, z.price FROM zakup_rashodniki_mes z
             INNER JOIN (SELECT artikul, MAX(timestamp) AS max_ts FROM zakup_rashodniki_mes GROUP BY artikul) m
             ON z.artikul = m.artikul AND z.timestamp = m.max_ts
             GROUP BY z.artikul, z.price`,
        );
        const artikulToPrice = new Map<string, number>(priceRows.map(r => [r.artikul, r.price]));

        const addresses = await this.addressRepo.find({ order: { address_code: 'ASC' } });

        logs.push({ level: 'info', address: '', sku_id: 0, sku_name: '', message: `Запуск расчёта ${dryRun ? '(пробный, без сохранения)' : '(с сохранением в БД)'} — ${new Date().toLocaleString('ru')}` });

        for (const addr of addresses) {
            const code = addr.address_code;
            logs.push({ level: 'info', address: code, sku_id: 0, sku_name: '', message: `━━━ Адрес ${code}: ${addr.name} ━━━` });

            const itemSettings = await this.itemSettingsRepo.find({ where: { address_code: code } });
            if (itemSettings.length === 0) {
                logs.push({ level: 'warn', address: code, sku_id: 0, sku_name: '', message: 'Нет позиций в товарной матрице' });
                items_warn++;
                continue;
            }

            // ── VALIDATION PHASE: группируем валидные позиции по поставщику ──
            const validItemsBySupplier = new Map<string, ValidItem[]>();
            const supplierSettingsMap = new Map<string, SupplierSettings>();

            for (const item of itemSettings) {
                const sku = await this.skuParamsRepo.findOne({ where: { sku_id: item.sku_id } });
                const skuName = sku?.name_short || sku?.name || `SKU#${item.sku_id}`;
                const pricePerUnit = sku?.artikul ? artikulToPrice.get(sku.artikul) : undefined;

                const rashod = await this.rashodRepo.findOne({ where: { address: code, item: item.sku_id } });
                if (!rashod) {
                    logs.push({ level: 'warn', address: code, sku_id: item.sku_id, sku_name: skuName, message: 'Нет данных о суточном расходе — принято 0' });
                    items_warn++;
                }

                if (item.nz === null || item.nz === undefined) {
                    logs.push({ level: 'error', address: code, sku_id: item.sku_id, sku_name: skuName, message: 'НЗ (минимальный запас) не задан' });
                    items_error++; continue;
                }
                if (!item.supplier_role) {
                    logs.push({ level: 'error', address: code, sku_id: item.sku_id, sku_name: skuName, message: 'Поставщик не назначен' });
                    items_error++; continue;
                }

                const supplier = await this.supplierSettingsRepo.findOne({ where: { address_code: code, supplier_role: item.supplier_role } });
                if (!supplier) {
                    logs.push({ level: 'error', address: code, sku_id: item.sku_id, sku_name: skuName, message: `Нет настроек поставщика «${item.supplier_role}» для этого адреса` });
                    items_error++; continue;
                }
                if (!supplier.delivery_days || supplier.delivery_days.trim() === '') {
                    logs.push({ level: 'error', address: code, sku_id: item.sku_id, sku_name: skuName, message: `Поставщик «${supplier.supplier_name}»: не заданы дни доставки` });
                    items_error++; continue;
                }
                if (supplier.lead_time_days === null || supplier.lead_time_days === undefined) {
                    logs.push({ level: 'warn', address: code, sku_id: item.sku_id, sku_name: skuName, message: `Поставщик «${supplier.supplier_name}»: срок поставки не задан — принято 0 дней` });
                    items_warn++;
                }

                const packMult = item.packaging_multiple ?? sku?.packaging_multiple;
                if (!packMult || packMult <= 0) {
                    logs.push({ level: 'error', address: code, sku_id: item.sku_id, sku_name: skuName, message: `Не задан коэффициент упаковки (packaging_multiple)` });
                    items_error++; continue;
                }

                const stockRow = addr.hid
                    ? await this.stock2Repo.findOne({ where: { address: addr.hid, sku_id: String(item.sku_id) }, order: { date: 'DESC' } })
                    : null;
                if (!stockRow) {
                    logs.push({ level: 'warn', address: code, sku_id: item.sku_id, sku_name: skuName, message: `Нет данных об остатке — принято 0` });
                    items_warn++;
                }

                supplierSettingsMap.set(item.supplier_role, supplier);
                if (!validItemsBySupplier.has(item.supplier_role)) validItemsBySupplier.set(item.supplier_role, []);
                validItemsBySupplier.get(item.supplier_role)!.push({
                    sku_id: item.sku_id, skuName, unit: sku?.packaging_supplier || 'уп',
                    pricePerUnit, packMult,
                    orderMult: item.order_multiple ?? sku?.order_multiple ?? 1,
                    dailyConsumption: (rashod?.value ?? 0) * (item.consumption_factor ?? 1),
                    nzVal: item.nz,
                    initialStock: stockRow?.value ?? 0,
                });
                items_ok++;
            }

            // ── PER-SUPPLIER SIMULATION ────────────────────────────────────────
            for (const [supplierRole, items] of validItemsBySupplier) {
                const suppSett = supplierSettingsMap.get(supplierRole)!;
                const leadTime = suppSett.lead_time_days ?? 0;
                const minSum = suppSett.min_order_sum;
                const supplierLabel = suppSett.supplier_name || supplierRole;

                // Текущие остатки (изменяются в симуляции)
                const stocks = new Map<number, number>(items.map(i => [i.sku_id, i.initialStock]));

                // Ожидаемые поставки: дата → sku_id → кол-во в наших единицах
                const simPending = new Map<string, Map<number, number>>();

                // Накопленные базовые заказы до финализации: дата → sku_id → кол-во в упаковках поставщика
                const accumulated = new Map<string, Map<number, number>>();

                // Уже заказанные даты доставки для каждого SKU
                const orderedDates = new Map<number, Set<string>>(items.map(i => [i.sku_id, new Set()]));

                const finalizedDates = new Set<string>();

                // Финализация заказа на дату delivDateStr:
                // 1. Применяем добор до min_order_sum
                // 2. Добавляем в simPending (симуляция получит правильный сток)
                // 3. Логируем 📦 сводку
                // 4. Добавляем в pendingOrders
                const finalizeDelivery = (delivDateStr: string, orderMap: Map<number, number>) => {
                    const delivDate = new Date(delivDateStr);

                    let totalSum = 0, missingPrices = 0;
                    for (const [skuId, qty] of orderMap) {
                        const it = items.find(i => i.sku_id === skuId)!;
                        if (it.pricePerUnit !== undefined) totalSum += qty * it.pricePerUnit;
                        else missingPrices++;
                    }

                    if (missingPrices === 0 && minSum && totalSum > 0 && totalSum < minSum) {
                        const pool = items.filter(i => i.pricePerUnit !== undefined && i.orderMult > 0);
                        // Для добора используем стоки симуляции на момент финализации
                        const topupStocks = new Map<number, number>(items.map(i => [i.sku_id, stocks.get(i.sku_id) ?? 0]));
                        const initialSumBeforeTopup = totalSum;

                        while (totalSum < minSum && pool.length > 0) {
                            const target = pool.reduce((best, p) => {
                                const s = topupStocks.get(p.sku_id) ?? 0;
                                const days = p.dailyConsumption > 0 ? s / p.dailyConsumption : (p.nzVal > 0 ? (s / p.nzVal) * 30 : 999999);
                                const bs = topupStocks.get(best.sku_id) ?? 0;
                                const bestDays = best.dailyConsumption > 0 ? bs / best.dailyConsumption : (best.nzVal > 0 ? (bs / best.nzVal) * 30 : 999999);
                                return days < bestDays ? p : best;
                            });
                            topupStocks.set(target.sku_id, (topupStocks.get(target.sku_id) ?? 0) + target.orderMult * target.packMult);
                            orderMap.set(target.sku_id, (orderMap.get(target.sku_id) ?? 0) + target.orderMult);
                            totalSum += target.orderMult * (target.pricePerUnit ?? 0);
                        }

                        logs.push({ level: 'warn', address: code, sku_id: 0, sku_name: '', message: `⚠️ Сумма ${initialSumBeforeTopup.toFixed(0)} ₽ < мин. ${minSum} ₽ — выполнен добор до ~${totalSum.toFixed(0)} ₽` });
                    }

                    // Добавляем в симуляцию (с учётом добора) — следующие дни увидят правильный сток
                    if (!simPending.has(delivDateStr)) simPending.set(delivDateStr, new Map());
                    for (const [skuId, qty] of orderMap) {
                        const it = items.find(i => i.sku_id === skuId)!;
                        const ourUnits = qty * it.packMult;
                        simPending.get(delivDateStr)!.set(skuId, (simPending.get(delivDateStr)!.get(skuId) ?? 0) + ourUnits);
                        pendingOrders.push({ address: code, supplier: supplierRole, product_id: skuId, count: qty, date: delivDate });
                    }

                    // Лог 📦
                    const dateFormatted = delivDate.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' });
                    let sumSuffix = '';
                    if (missingPrices > 0) {
                        sumSuffix = ` | мин. сумма ${minSum ?? '?'} ₽ (цена не найдена для ${missingPrices} поз. — проверьте вручную)`;
                    } else if (minSum) {
                        let finalSum = 0;
                        for (const [skuId, qty] of orderMap) {
                            const it = items.find(i => i.sku_id === skuId)!;
                            if (it.pricePerUnit !== undefined) finalSum += qty * it.pricePerUnit;
                        }
                        sumSuffix = finalSum < minSum
                            ? ` | ⚠️ сумма ~${finalSum.toFixed(0)} ₽ < мин. ${minSum} ₽ (нет позиций для добора)`
                            : ` | сумма ~${finalSum.toFixed(0)} ₽ ✓`;
                    }
                    const itemLines = Array.from(orderMap.entries())
                        .map(([skuId, qty]) => { const it = items.find(i => i.sku_id === skuId)!; return `${it.skuName} ×${qty} ${it.unit}`; })
                        .join(', ');
                    logs.push({ level: 'info', address: code, sku_id: 0, sku_name: '', message: `📦 ${supplierLabel} | ${dateFormatted} | ${orderMap.size} поз: ${itemLines}${sumSuffix}` });
                };

                // ── День-за-днём ──────────────────────────────────────────────
                for (let day = 0; day <= CalculationService.CALC_HORIZON_DAYS; day++) {
                    const simDate = new Date(today);
                    simDate.setDate(today.getDate() + day);
                    const simDateStr = simDate.toISOString().split('T')[0];

                    // 1. Финализируем заказы, чей дедлайн наступил
                    for (const [delivDateStr, orderMap] of accumulated) {
                        if (finalizedDates.has(delivDateStr)) continue;
                        const deadline = new Date(delivDateStr);
                        deadline.setDate(deadline.getDate() - leadTime);
                        deadline.setHours(0, 0, 0, 0);
                        if (simDateStr >= deadline.toISOString().split('T')[0]) {
                            finalizedDates.add(delivDateStr);
                            finalizeDelivery(delivDateStr, orderMap);
                        }
                    }

                    // 2. Получаем поставки этого дня (включая только что финализированные)
                    const incoming = simPending.get(simDateStr);
                    if (incoming) {
                        for (const [skuId, qty] of incoming) {
                            stocks.set(skuId, (stocks.get(skuId) ?? 0) + qty);
                        }
                    }

                    // 3. Суточный расход
                    for (const item of items) {
                        stocks.set(item.sku_id, Math.max(0, (stocks.get(item.sku_id) ?? 0) - item.dailyConsumption));
                    }

                    // 4. Проверяем, нужен ли заказ
                    for (const item of items) {
                        const s = stocks.get(item.sku_id) ?? 0;
                        if (s < item.nzVal) {
                            const delivDate = this.getNextDeliveryAfter(suppSett.delivery_days, leadTime, simDate);
                            if (!delivDate) continue;
                            const delivDateStr = delivDate.toISOString().split('T')[0];
                            if (orderedDates.get(item.sku_id)!.has(delivDateStr)) continue;
                            orderedDates.get(item.sku_id)!.add(delivDateStr);

                            const daysToDeliv = Math.round((delivDate.getTime() - simDate.getTime()) / 86400000);
                            const stockAtDeliv = Math.max(0, s - item.dailyConsumption * daysToDeliv);
                            const nextDeliv = this.getNextDeliveryAfter(suppSett.delivery_days, leadTime, delivDate);
                            const coverDays = nextDeliv ? Math.round((nextDeliv.getTime() - delivDate.getTime()) / 86400000) : 7;
                            const targetStock = item.nzVal + item.dailyConsumption * coverDays;
                            const orderQtyOur = Math.max(0, targetStock - stockAtDeliv);
                            const orderQtySupplier = Math.ceil(orderQtyOur / item.packMult / item.orderMult) * item.orderMult;

                            if (orderQtySupplier > 0) {
                                if (!accumulated.has(delivDateStr)) accumulated.set(delivDateStr, new Map());
                                accumulated.get(delivDateStr)!.set(item.sku_id, (accumulated.get(delivDateStr)!.get(item.sku_id) ?? 0) + orderQtySupplier);

                                const ds = delivDate.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' });
                                logs.push({ level: 'success', address: code, sku_id: item.sku_id, sku_name: item.skuName, message: `${ds}: ${orderQtySupplier} ${item.unit} (остаток при доставке ~${stockAtDeliv.toFixed(1)}, покрытие ${coverDays}д, НЗ ${item.nzVal})` });
                            }
                        }
                    }
                }

                // Финализируем оставшиеся (дедлайн не наступил в пределах горизонта)
                for (const [delivDateStr, orderMap] of accumulated) {
                    if (!finalizedDates.has(delivDateStr)) {
                        finalizedDates.add(delivDateStr);
                        finalizeDelivery(delivDateStr, orderMap);
                    }
                }

                // Позиции без заказов
                for (const item of items) {
                    const hadOrders = Array.from(accumulated.values()).some(m => m.has(item.sku_id));
                    if (!hadOrders) {
                        logs.push({ level: 'info', address: code, sku_id: item.sku_id, sku_name: item.skuName, message: `Заказ не нужен — остаток ${item.initialStock.toFixed(1)} >= НЗ ${item.nzVal} на весь период` });
                    }
                }
            }
        }

        // ── Итог ───────────────────────────────────────────────
        logs.push({ level: 'info', address: '', sku_id: 0, sku_name: '', message: `━━━ Итог: ✅ ${items_ok} OK  ⚠️ ${items_warn} предупреждений  ❌ ${items_error} ошибок ━━━` });

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

            // Диапазон дат заказа
            const dates = pendingOrders.map(o => o.date.getTime());
            const startDay = new Date(Math.min(...dates));
            const endDay = new Date(Math.max(...dates));

            // Удаляем старые записи order_access для расчётных заказов
            const oldCalcAccess = await this.orderAccessRepo.find({ where: { flag: 'TM_AUTOZAKAZI' } });
            const oldCalcIds = oldCalcAccess.filter(r => r.order_id.startsWith('calc_'));
            if (oldCalcIds.length > 0) {
                await this.orderAccessRepo.remove(oldCalcIds);
            }

            // Вставляем новую запись
            const access = this.orderAccessRepo.create({
                name: 'Расчёт автозаказов',
                flag: 'TM_AUTOZAKAZI',
                order_id: orderId,
                start_day: startDay,
                end_day: endDay,
            });
            await this.orderAccessRepo.save(access);

            logs.push({ level: 'success', address: '', sku_id: 0, sku_name: '', message: `✅ Сохранено ${ordersCreated} позиций. ID заказа: ${orderId}` });
        }

        return { logs, ordersCreated, orderId, summary: { addresses: addresses.length, items_ok, items_warn, items_error } };
    }
}
