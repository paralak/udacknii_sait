import {Injectable} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Exclusion, Repository } from 'typeorm';
import { Item } from 'src/db/item.entity';
import { Stock } from 'src/db/stock.entity';
import { Sales } from 'src/db/sales.entity';
import { Peremesh } from 'src/db/peremesh.module';
import { Postavki } from 'src/db/postavki.module';
import { Spisania } from 'src/db/spisania.module';

@Injectable()
export class Bd_importService {
    constructor (
        @InjectRepository(Item)
        private readonly itemsRepository: Repository<Item>,

        @InjectRepository(Stock)
        private readonly stocksRepository: Repository<Stock>,

        @InjectRepository(Sales)
        private readonly salesRepository: Repository<Sales>,

        @InjectRepository(Peremesh)
        private readonly peremeshRepository: Repository<Peremesh>,

        @InjectRepository(Postavki)
        private readonly postavkiRepository: Repository<Postavki>,

        @InjectRepository(Spisania)
        private readonly spisaniaRepository: Repository<Spisania>,
    ) {}

    getHello(): string {
        return 'Hello Worl2d!';
    }

    getCodesList() {

    }

    async getCodes() {
        const lst = this.itemsRepository.find();
        const codes = [];
        (await lst).forEach(element => {
            codes.push(element.code)
        });
        return {
            codes:codes,
        }
    }

    async sendDatas(args: object) {
        try {
            for (const key in args) {
                
                const element = args[key];
                const isodate = key;
                for (const code in element) {
                    const rrr = element[code];

                    if (rrr.hasOwnProperty('stock')) {
                        const st = new Stock();
                        st.code = code;
                        st.date = isodate;
                        st.value = rrr['stock'];
                        this.stocksRepository.save(st);
                    }
                    if (rrr.hasOwnProperty('sales')) {
                        const st = new Sales();
                        st.code = code;
                        st.date = isodate;
                        st.value = rrr['sales'];
                        this.salesRepository.save(st);
                    }
                    if (rrr.hasOwnProperty('write-off')) {
                        const st = new Sales();
                        st.code = code;
                        st.date = isodate;
                        st.value = rrr['write-off'];
                        this.spisaniaRepository.save(st);
                    }
                    if (rrr.hasOwnProperty('supplies')) {
                        const st = new Sales();
                        st.code = code;
                        st.date = isodate;
                        st.value = rrr['supplies'];
                        this.postavkiRepository.save(st);
                    }
                    if (rrr.hasOwnProperty('move')) {
                        const st = new Sales();
                        st.code = code;
                        st.date = isodate;
                        st.value = rrr['move'];
                        this.peremeshRepository.save(st);
                    }
                }

            }
        } catch (e) {
            return {error:e}
        }
    }
}
