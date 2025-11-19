import {Injectable} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Exclusion, Repository } from 'typeorm';
import { Item } from 'src/db/item.entity';
import { Stock } from 'src/db/stock.entity';

@Injectable()
export class Bd_importService {
    constructor (
        @InjectRepository(Item)
        private readonly itemsRepository: Repository<Item>,

        @InjectRepository(Stock)
        private readonly stocksRepository: Repository<Stock>,
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

                }

            }
        } catch (e) {
            return {error:e}
        }
    }
}
