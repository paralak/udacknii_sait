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

    async getHierarchyTree(authToken: string) {
        const lst = await this.itemsRepository.find();
        let resp = await this.checkToken(authToken);

        if (resp.status != 'valid') {
          return resp;
        }

        let rlst = lst.filter((item) => {
          return item.id == resp.userId;
        })

        let ridstop = []
        let ridsbot = []

        for (let i = 0; i < 20; i++) {
          rlst.map((item)=>{
            if (item.id in ridsbot) {
              return;
            }
            if (item.parent_id in ridstop) {
              return;
            }
            if (item.parent_id == resp.userId) {
              return;
            }
            let np = lst.filter((item2) => {
              return item2.id == item.parent_id;
            })[0];
            if (!np) {return;}
            rlst.push(np);
            ridstop.push(np.id);
          });
          lst.map((item)=>{
            if (item.id in ridsbot) {
              return;
            }
            if (item.parent_id in ridstop) {
              return;
            }
            if (item.parent_id == resp.userId) {
              return;
            }
            let op = rlst.filter((item2) => {
              return item.parent_id == item2.id;
            })[0];
            if (!op) {
              return;
            }
            rlst.push(op);
            ridsbot.push(op.id);
          })
        }

        lst.map((item) => {
          if (item.type == 'Department' && !(item.id in ridstop) && !(item.id in ridsbot)) {
            rlst.push(item);
          }
        });

        return rlst;
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
