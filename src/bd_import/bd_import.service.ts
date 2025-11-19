import {Injectable} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from 'src/db/item.entity';

@Injectable()
export class Bd_importService {
    constructor (
        @InjectRepository(Item)
        private readonly itemsRepository: Repository<Item>,
    ) {}

    getHello(): string {
        return 'Hello Worl2d!';
    }

    getCodesList() {

    }

    async findAllItems() {
        const lst = this.itemsRepository.find();
        const codes = [];
        (await lst).forEach(element => {
            codes.push(element.code)
        });
        return {
            codes:codes,
        }
    }
}
