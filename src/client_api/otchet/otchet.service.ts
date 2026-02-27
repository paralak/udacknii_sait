import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { M_for_zarplati } from 'src/db/m_for_zarplati.entity';
import { Repository } from 'typeorm';

@Injectable()
export class OtchetService {
    constructor(
        @InjectRepository(M_for_zarplati)
        private mForZarplatiRepository: Repository<M_for_zarplati>,
    ) {}

    async getMonths(hid: number) {
        let r = await this.mForZarplatiRepository.find({
            where: { addr: hid }
        });
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