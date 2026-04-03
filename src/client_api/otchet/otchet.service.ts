import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { M_for_zarplati } from 'src/db/m_for_zarplati.entity';
import { Prodaji_napitki_mes } from 'src/db/prodaji_napitki_mes.entity';
import { Repository } from 'typeorm';
import { ADDRESS_MAP, DRINKS_MAP } from './otchet.constants';
import { Prodaji_dec_mes_2 } from 'src/db/prodaji_dec_mes_2.entity';

@Injectable()
export class OtchetService {
    constructor(
        @InjectRepository(M_for_zarplati)
        private mForZarplatiRepository: Repository<M_for_zarplati>,
        @InjectRepository(Prodaji_napitki_mes)
        private prodajiNapitkiMesRepository: Repository<Prodaji_napitki_mes>,
        @InjectRepository(Prodaji_dec_mes_2)
        private prodajiDecMes2Repository: Repository<Prodaji_dec_mes_2>,
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

    async getProdajiNapitkiMes(addr: string) {
        //заменим полученый адрес на код для поиска в базе, код это ключ в объекте ADDRESS_MAP, а нам приходит значение, мы проходим по объекту и ищем ключ по значению, если не находим то возвращаем полученый адрес
        const normalizedAddr = Object.keys(ADDRESS_MAP).find(key => ADDRESS_MAP[key] === addr) || addr;

        let r = await this.prodajiNapitkiMesRepository.find({
            where: { address: normalizedAddr },
            order: { timestamp: 'ASC' }
        });
        if (!r || r.length === 0) {
            return {
                status: 'error',
                message: 'Информация не найдена',
            };
        }

        //меняем коды на названия для адресов и напитков и убираем те которых нет в списке адреса или напитка
        r = r
            .filter(item => ADDRESS_MAP[item.address] && DRINKS_MAP[item.name])
            .map(item => {
                return {
                    ...item,
                    address: ADDRESS_MAP[item.address],
                    name: DRINKS_MAP[item.name],
                }
            });

        return {
            status: 'success',
            data: r,
        };
    }

    async getProdajiDecMes2(addr: string) {
        const normalizedAddr = Object.keys(ADDRESS_MAP).find(key => ADDRESS_MAP[key] === addr) || addr;
        let r = await this.prodajiDecMes2Repository.find({
            where: { address: normalizedAddr },
            order: { timestamp: 'ASC' }
        });
        if (!r || r.length === 0) {
            return {
                status: 'error',
                message: 'Информация не найдена',
            };
        }

        r = r
            .filter(item => ADDRESS_MAP[item.address])
            .map(item => {
                return {
                    ...item,
                    address: ADDRESS_MAP[item.address],
                }
            });

        return {
            status: 'success',
            data: r,
        };
    }
}