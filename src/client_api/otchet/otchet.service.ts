import { Injectable } from '@nestjs/common';
import { M_for_zarplati } from 'src/db/m_for_zarplati.entity';
import { Repository } from 'typeorm';

@Injectable()
export class OtchetService {
    constructor(
        private readonly mForZarplatiRepository: Repository<M_for_zarplati>,
    ) {}

    async getMonths(hid: number) {
        let r = await this.mForZarplatiRepository.find({
            where: { hid: hid }
        });
        //нужно вывести ответ со списком месяцов и ошибку если не найдено
        if (!r || r.length === 0) {
            return {
                status: 'error',
                message: 'Информация не найдена',
            };
        }
        return {
            status: 'success',
            data: r,
        };
    }
}