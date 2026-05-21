import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SkuRashod } from 'src/db/sku_rashod.entity';
import { SkuTtk } from 'src/db/sku_ttk.entity';
import { CONSUMPTION_HISTORY_MONTHS, consumptionWeight } from './consumption.constants';

interface SalesRow {
    address: string;
    name: string;
    count: number;
    timestamp: Date;
}

@Injectable()
export class ConsumptionService {
    private readonly logger = new Logger(ConsumptionService.name);

    constructor(
        @InjectRepository(SkuRashod)
        private skuRashodRepository: Repository<SkuRashod>,
        @InjectRepository(SkuTtk)
        private skuTtkRepository: Repository<SkuTtk>,
        private dataSource: DataSource,
    ) {}

    /** Загружает матрицу ТТК из БД.
     *  Возвращает Map: address_code → drink_code → sku_id → coeff.
     *  NULL address_code = глобальный; адресный переопределяет глобальный. */
    async loadTtkMatrix(): Promise<Map<string | null, Map<string, Map<number, number>>>> {
        const rows = await this.skuTtkRepository.find();

        const matrix = new Map<string | null, Map<string, Map<number, number>>>();
        for (const row of rows) {
            const addr = row.address_code;
            if (!matrix.has(addr)) matrix.set(addr, new Map());
            const byDrink = matrix.get(addr)!;
            if (!byDrink.has(row.drink_code)) byDrink.set(row.drink_code, new Map());
            byDrink.get(row.drink_code)!.set(row.sku_id, row.coeff);
        }
        return matrix;
    }

    /** Возвращает коэффициент для (address, drink, sku):
     *  адресный имеет приоритет над глобальным. */
    private getCoeff(
        matrix: Map<string | null, Map<string, Map<number, number>>>,
        address: string,
        drink: string,
        skuId: number,
    ): number | undefined {
        const addrMap = matrix.get(address)?.get(drink)?.get(skuId);
        if (addrMap !== undefined) return addrMap;
        return matrix.get(null)?.get(drink)?.get(skuId);
    }

    @Cron('0 3 * * 0', { name: 'recalculate-consumption' })
    async recalculateConsumption(): Promise<void> {
        this.logger.log('Запуск пересчёта суточного расхода (sku_rashod)...');
        try {
            const updated = await this.calculate();
            this.logger.log(`Готово. Обновлено записей: ${updated}`);
        } catch (err) {
            this.logger.error('Ошибка пересчёта расхода', err);
        }
    }

    async calculate(): Promise<number> {
        const ttkMatrix = await this.loadTtkMatrix();

        // Все drink_code из глобальной матрицы
        const globalDrinks = ttkMatrix.get(null) ?? new Map<string, Map<number, number>>();
        const knownDrinks = Array.from(globalDrinks.keys());
        if (knownDrinks.length === 0) {
            this.logger.warn('sku_ttk пуста — нечего рассчитывать');
            return 0;
        }

        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - CONSUMPTION_HISTORY_MONTHS);

        const sales: SalesRow[] = await this.dataSource.query(
            `SELECT address, name, count, timestamp
             FROM prodaji_napitki_mes
             WHERE name IN (${knownDrinks.map(() => '?').join(',')})
               AND timestamp >= ?
             ORDER BY timestamp DESC`,
            [...knownDrinks, cutoff],
        );

        if (sales.length === 0) {
            this.logger.warn('Нет данных продаж для пересчёта расхода');
            return 0;
        }

        const latestTs = sales.reduce(
            (max, r) => (r.timestamp > max ? r.timestamp : max),
            sales[0].timestamp,
        );

        // acc[address][sku_id][monthKey] = { contribution, weight }
        type MonthBucket = { contribution: number; weight: number };
        const acc: Record<string, Record<number, Record<string, MonthBucket>>> = {};

        for (const row of sales) {
            const ts = new Date(row.timestamp);
            const daysInMonth = new Date(ts.getFullYear(), ts.getMonth() + 1, 0).getDate();
            const monthKey = `${ts.getFullYear()}-${ts.getMonth()}`;

            const monthsAgo = Math.round(
                (latestTs.getTime() - ts.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
            );
            const weight = consumptionWeight(monthsAgo);
            const dailySales = row.count / daysInMonth;

            // Определяем набор sku для этого напитка на этом адресе
            // (объединяем глобальные sku + адресные overrides)
            const globalSkus = globalDrinks.get(row.name) ?? new Map<number, number>();
            const addrSkus = ttkMatrix.get(row.address)?.get(row.name) ?? new Map<number, number>();
            const allSkuIds = new Set([...globalSkus.keys(), ...addrSkus.keys()]);

            if (!acc[row.address]) acc[row.address] = {};

            for (const skuId of allSkuIds) {
                const coeff = this.getCoeff(ttkMatrix, row.address, row.name, skuId);
                if (!coeff) continue;

                if (!acc[row.address][skuId]) acc[row.address][skuId] = {};
                if (!acc[row.address][skuId][monthKey]) {
                    acc[row.address][skuId][monthKey] = { contribution: 0, weight };
                }
                acc[row.address][skuId][monthKey].contribution += dailySales * coeff;
            }
        }

        let updatedCount = 0;
        for (const [address, items] of Object.entries(acc)) {
            for (const [skuIdStr, months] of Object.entries(items)) {
                const skuId = Number(skuIdStr);
                let wSum = 0, wTotal = 0;
                for (const { contribution, weight } of Object.values(months)) {
                    wSum += weight * contribution;
                    wTotal += weight;
                }
                if (wTotal === 0) continue;

                const value = Math.round((wSum / wTotal) * 10000) / 10000;
                await this.dataSource.query(
                    `INSERT INTO sku_rashod (address, item, value)
                     VALUES (?, ?, ?)
                     ON DUPLICATE KEY UPDATE value = VALUES(value)`,
                    [address, skuId, value],
                );
                updatedCount++;
            }
        }

        return updatedCount;
    }
}
