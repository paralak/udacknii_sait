import {Injectable} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Exclusion, Repository } from 'typeorm';
import { Item } from 'src/db/item.entity';
import { Stock } from 'src/db/stock.entity';
import { Sales } from 'src/db/sales.entity';
import { Peremesh } from 'src/db/peremesh.entity';
import { Postavki } from 'src/db/postavki.entity';
import { Spisania } from 'src/db/spisania.entity';
import { Token } from 'src/db/token.entity';

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

        @InjectRepository(Token)
        private readonly tokenRepository: Repository<Token>,
    ) {}

    async checkToken(token: string) {
        let r = await this.tokenRepository.findOne({
            where: { token }
        });
        if (!r) {
            return {
                status: 'error',
                message: 'Токен не найден',
            };
        }
        if (r.expired < new Date()) {
            return {
                status: 'error',
                message: 'Токен истек',
            };
        }
        return {
            status: 'success',
            data: r.user_id,
        };
    }

    async getAddressList() {
        const lst = [
            {
                code: 'ТП00071',
                date: new Date('2026-01-01'),
            },
            {
                code: 'ТП00071',
                date: new Date('2026-02-01'),
            },
            {
                code: 'ТП00138',
                date: new Date('2026-01-01'),
            },
            {
                code: 'ТП00138',
                date: new Date('2026-02-01'),
            },
        ]
        return {
            status: 'success',
            data: lst,
        };
    }

    async sendAddressSums(args: any) {
        console.log(args);
        return {
            status: 'success',
        };
    }

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

    async sendDatas(args: any) {
        try {

            for (let j = 0; j < args.length; ++j) {
                console.log(args);
                
                const element = args[j]['Items'];
                const isodate = args[j]['Date'];
                
                for (let i = 0; i < element.length; ++i) {
                    const rrr = element[i];
                    
                    if (!rrr.hasOwnProperty('code')) continue;

                    if (rrr.hasOwnProperty('stock')) {
                        const st = new Stock();
                        st.code = rrr['code'];
                        st.date = isodate;
                        st.value = rrr['stock'];
                        this.stocksRepository.save(st);
                    }
                    if (rrr.hasOwnProperty('sales')) {
                        const st = new Sales();
                        st.code = rrr['code'];
                        st.date = isodate;
                        st.value = rrr['sales'];
                        this.salesRepository.save(st);
                    }
                    if (rrr.hasOwnProperty('writeoff')) {
                        const st = new Sales();
                        st.code = rrr['code'];
                        st.date = isodate;
                        st.value = rrr['writeoff'];
                        this.spisaniaRepository.save(st);
                    }
                    if (rrr.hasOwnProperty('supplies')) {
                        const st = new Sales();
                        st.code = rrr['code'];
                        st.date = isodate;
                        st.value = rrr['supplies'];
                        this.postavkiRepository.save(st);
                    }
                    if (rrr.hasOwnProperty('move')) {
                        const st = new Sales();
                        st.code = rrr['code'];
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
