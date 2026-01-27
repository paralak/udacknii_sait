import {Injectable} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Exclusion, Repository } from 'typeorm';
import { Hierarchy } from 'src/db/hierarchy.entity';
import { Token } from 'src/db/token.entity';

@Injectable()
export class ClientAPIService {
    constructor (
        @InjectRepository(Hierarchy)
        private readonly itemsRepository: Repository<Hierarchy>,
        @InjectRepository(Token)
        private readonly tokenRepository: Repository<Token>,
    ) {}

    getHello(): string {
        return 'Hello World from Client API!';
    }

    async getHierarchyTree() {
        const lst = this.itemsRepository.find();
        return lst;
    }

    async checkToken(tokenValue: string) {
    // Ищем токен по значению (не по id)
    const token = await this.tokenRepository.findOne({
      where: { token: tokenValue },
    });

    // 1. Токен не существует
    if (!token) {
      return {
        status: 'not_found',
        message: 'Токен не найден',
      };
    }

    const now = new Date();
    const expiredDate = new Date(token.expired);

    // 2. Токен истёк
    if (expiredDate < now) {
      return {
        status: 'expired',
        message: 'Токен истёк',
        expiredAt: token.expired,
      };
    }

    // 3. Токен верен
    return {
      status: 'valid',
      message: 'Токен действителен',
      userId: token.user_id,
      expiresAt: token.expired,
    };
  }
}
