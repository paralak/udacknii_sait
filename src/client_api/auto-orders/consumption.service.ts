import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SkuRashod } from 'src/db/sku_rashod.entity';
import {
    CONSUMPTION_MATRIX,
    CONSUMPTION_HISTORY_MONTHS,
    consumptionWeight,
} from './consumption.constants';

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
        private dataSource: DataSource,
    ) {}

    /**
     * Пересчитывает суточный расход (sku_rashod) каждое воскресенье в 03:00.
     * Берёт последние CONSUMPTION_HISTORY_MONTHS месяцев из prodaji_napitki_mes,
     * применяет матрицу ТТК и взвешенное среднее по давности месяца.
     */
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

    /** Публичный метод для ручного запуска через API */
    async calculate(): Promise<number> {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - CONSUMPTION_HISTORY_MONTHS);

        // Загружаем продажи кофейных напитков за период
        const knownDrinks = Object.keys(CONSUMPTION_MATRIX);
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

        // Находим самый свежий месяц как точку отсчёта давности
        const latestTs = sales.reduce(
            (max, r) => (r.timestamp > max ? r.timestamp : max),
            sales[0].timestamp,
        );

        // Шаг 1: накапливаем суммарный расход по (address, sku_id, monthKey).
        // Ключ monthKey = "YYYY-M" — уникален на месяц.
        // Несколько напитков в одном месяце используют один sku_id → их вклады суммируются,
        // а вес месяца фиксируется один раз, иначе знаменатель растёт кратно числу напитков.
        type MonthBucket = { contribution: number; weight: number };
        const acc: Record<string, Record<number, Record<string, MonthBucket>>> = {};

        for (const row of sales) {
            const matrix = CONSUMPTION_MATRIX[row.name];
            if (!matrix) continue;

            const ts = new Date(row.timestamp);
            const daysInMonth = new Date(ts.getFullYear(), ts.getMonth() + 1, 0).getDate();
            const monthKey = `${ts.getFullYear()}-${ts.getMonth()}`;

            const monthsAgo = Math.round(
                (latestTs.getTime() - ts.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
            );
            const weight = consumptionWeight(monthsAgo);

            const dailySales = row.count / daysInMonth;

            if (!acc[row.address]) acc[row.address] = {};

            for (const [skuIdStr, coeff] of Object.entries(matrix)) {
                const skuId = Number(skuIdStr);
                const contribution = dailySales * coeff;

                if (!acc[row.address][skuId]) acc[row.address][skuId] = {};
                if (!acc[row.address][skuId][monthKey]) {
                    acc[row.address][skuId][monthKey] = { contribution: 0, weight };
                }
                // Суммируем вклады всех напитков за этот месяц
                acc[row.address][skuId][monthKey].contribution += contribution;
            }
        }

        // Шаг 2: взвешенное среднее по месяцам → суточный расход sku_id на address
        let updatedCount = 0;
        for (const [address, items] of Object.entries(acc)) {
            for (const [skuIdStr, months] of Object.entries(items)) {
                const skuId = Number(skuIdStr);

                let wSum = 0;
                let wTotal = 0;
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
