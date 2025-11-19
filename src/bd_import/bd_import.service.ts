import {Injectable} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from '@nestjs/typeorm';
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

    async findAllItems(): Promise<Item[]> {
        return this.itemsRepository.find();
    }
}
