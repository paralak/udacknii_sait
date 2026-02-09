import {Injectable} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Exclusion, In, Repository } from 'typeorm';
import { Hierarchy } from 'src/db/hierarchy.entity';
import { Token } from 'src/db/token.entity';
import { Adresses } from 'src/db/adresses.entity';

@Injectable()
export class ClientAPIService {
    constructor (
        @InjectRepository(Hierarchy)
        private readonly itemsRepository: Repository<Hierarchy>,
        @InjectRepository(Token)
        private readonly tokenRepository: Repository<Token>,
        @InjectRepository(Adresses)
        private readonly adressesRepository: Repository<Adresses>,
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

      // Начинаем с элементов, принадлежащих пользователю
      let rlst = lst.filter((item) => {
          return item.id == resp.userId;
      });

      let ridstop: number[] = [];  // ID элементов, добавленных как родители
      let ridsbot: number[] = [];  // ID элементов, добавленных как дети

      for (let i = 0; i < 20; i++) {
          // Добавляем родителей текущих элементов
          rlst.forEach((item) => {
              // Пропускаем, если элемент уже был добавлен как ребенок
              if (ridsbot.includes(item.id)) {
                  return;
              }
              
              // Пропускаем, если родитель уже добавлен в верхние элементы
              if (ridstop.includes(item.parent_id)) {
                  return;
              }
              
              // Пропускаем, если родитель - сам пользователь
              if (item.parent_id == resp.userId) {
                  return;
              }
              
              // Ищем родительский элемент
              let np = lst.find((item2) => {
                  return item2.id == item.parent_id;
              });
              
              if (!np) {
                  return;
              }
              
              // Добавляем родителя
              rlst.push(np);
              ridstop.push(np.id);
          });

          // Добавляем детей текущих элементов
          lst.forEach((item) => {
              // Пропускаем, если элемент уже был добавлен как ребенок
              if (ridsbot.includes(item.id)) {
                  return;
              }
              
              // Пропускаем, если родитель уже добавлен в верхние элементы
              if (ridstop.includes(item.parent_id)) {
                  return;
              }
              
              // Ищем, есть ли элемент в rlst, который является родителем для текущего
              let op = rlst.find((item2) => {
                  return item.parent_id == item2.id;
              });
              
              if (!op) {
                  return;
              }
              
              // Добавляем ребенка
              rlst.push(item);
              ridsbot.push(item.id);
          });
      }

      // Добавляем все отделы, которые еще не были добавлены
      lst.forEach((item) => {
          if (item.type == 'Department' && 
              !ridstop.includes(item.id) && 
              !ridsbot.includes(item.id)) {
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

  async getAddressTree(authToken: string) {
    let lst = await this.itemsRepository.find();
    let lst2 = await this.adressesRepository.find();
    let resp = await this.checkToken(authToken);
    if (resp.status != 'valid') {
        return resp;
    } 
    // Начинаем с элементов, принадлежащих пользователю
      let rlst = lst.filter((item) => {
          return item.id == resp.userId;
      });

      let ridstop: number[] = [];  // ID элементов, добавленных как родители
      let ridsbot: number[] = [];  // ID элементов, добавленных как дети

      for (let i = 0; i < 20; i++) {
          // Добавляем родителей текущих элементов
          rlst.forEach((item) => {
              // Пропускаем, если элемент уже был добавлен как ребенок
              if (ridsbot.includes(item.id)) {
                  return;
              }
              
              // Пропускаем, если родитель уже добавлен в верхние элементы
              if (ridstop.includes(item.parent_id)) {
                  return;
              }
              
              // Пропускаем, если родитель - сам пользователь
              if (item.parent_id == resp.userId) {
                  return;
              }
              
              // Ищем родительский элемент
              let np = lst.find((item2) => {
                  return item2.id == item.parent_id;
              });
              
              if (!np) {
                  return;
              }
              
              // Добавляем родителя
              rlst.push(np);
              ridstop.push(np.id);
          });

          // Добавляем детей текущих элементов
          lst.forEach((item) => {
              // Пропускаем, если элемент уже был добавлен как ребенок
              if (ridsbot.includes(item.id)) {
                  return;
              }
              
              // Пропускаем, если родитель уже добавлен в верхние элементы
              if (ridstop.includes(item.parent_id)) {
                  return;
              }
              
              // Ищем, есть ли элемент в rlst, который является родителем для текущего
              let op = rlst.find((item2) => {
                  return item.parent_id == item2.id;
              });
              
              if (!op) {
                  return;
              }
              
              // Добавляем ребенка
              rlst.push(item);
              ridsbot.push(item.id);
          });
      }

      // Добавляем все отделы, которые еще не были добавлены
      lst.forEach((item) => {
          if (item.type == 'Department' && 
              !ridstop.includes(item.id) && 
              !ridsbot.includes(item.id)) {
              rlst.push(item);
          }
      });

      let rlst2 = rlst.filter((item) => {
        return item.type == 'Store';
      });

      rlst2.push(...lst2.filter((item) => {
        return item.type == 'Address';
      }));

      return rlst2;

  }
}
