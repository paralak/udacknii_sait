import {Injectable} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Exclusion, Repository } from 'typeorm';
import { Hierarchy } from 'src/db/hierarchy.entity';

@Injectable()
export class ClientAPIService {
    constructor (
        @InjectRepository(Hierarchy)
        private readonly itemsRepository: Repository<Hierarchy>,
    ) {}

    getHello(): string {
        return 'Hello World from Client API!';
    }

    async getHierarchyTree() {
        const lst = this.itemsRepository.find();
        return lst;
    }
}
