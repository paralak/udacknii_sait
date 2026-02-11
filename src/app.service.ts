import {Injectable} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Token } from './db/token.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AppService {
    constructor(
        
    ) {}



    getHello(): string {
        return 'Hello Worl1d!';
    }
}
