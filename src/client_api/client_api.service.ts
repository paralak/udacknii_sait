import {Injectable} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Exclusion, In, Repository } from 'typeorm';
import { Hierarchy } from 'src/db/hierarchy.entity';
import { Token } from 'src/db/token.entity';
import { Addresses } from 'src/db/addresses.entity';
import { Login } from 'src/db/login.entity';
import { Flags } from 'src/db/flags.entity';
import { UserProfile } from 'src/db/user_profile.entity';


@Injectable()
export class ClientAPIService {
    constructor (
        @InjectRepository(Hierarchy)
        private readonly itemsRepository: Repository<Hierarchy>,
        @InjectRepository(Token)
        private readonly tokenRepository: Repository<Token>,
        @InjectRepository(Addresses)
        private readonly addressesRepository: Repository<Addresses>,
        @InjectRepository(Login)
        private readonly loginRepository: Repository<Login>,
        @InjectRepository(Flags)
        private readonly flagsRepository: Repository<Flags>,
        @InjectRepository(UserProfile)
        private readonly userProfileRepository: Repository<UserProfile>,
    ) {}

    getHello(): string {
        return 'Hello World from Client API!';
    }

    async getHierarchyTree(authToken: string) {
      const resp = await this.checkToken(authToken);

      if (resp.status !== 'valid') {
          return resp;
      }

      const hasHierarchyAccess =
          resp.flags.includes('HIERARCHY') || resp.flags.includes('ADMIN');

      if (hasHierarchyAccess) {
          // Полная иерархия: все департаменты, подразделения и сотрудники
          return this.itemsRepository.find({
              where: { type: In(['Department', 'Company', 'Person']) },
              order: { sort_order: 'ASC', id: 'ASC' },
          });
      } else {
          // Только структура департаментов и подразделений (без сотрудников)
          return this.itemsRepository.find({
              where: { type: In(['Department', 'Company']) },
              order: { sort_order: 'ASC', id: 'ASC' },
          });
      }
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

    const hidObj = this.itemsRepository.findOne({
        where:{
            id:token.user_id,
        }
    })
    // так же получаем флаги для данного пользователя в виде массива строк
    const flags = await this.flagsRepository.find({
        where: {
            hid: token.user_id,
        },
    });
    // 3. Токен верен
    return {
        status: 'valid',
        message: 'Токен действителен',
        userId: token.user_id,
        hidObj,
        flags: flags.map((f) => f.flag),
        expiresAt: token.expired,
    };
  }

  async getAddressTree(authToken: string) {
    let lst = await this.itemsRepository.find({ order: { sort_order: 'ASC', id: 'ASC' } });
    let lst2 = await this.addressesRepository.find();
    let resp = await this.checkToken(authToken);
    if (resp.status != 'valid') {
        return resp;
    }

    // TM-пользователи: фильтруем по флагам TM_{id}
    const tmStoreIds = resp.flags
        .filter(f => /^TM_\d+$/.test(f))
        .map(f => parseInt(f.replace('TM_', '')));

    if (tmStoreIds.length > 0 && !resp.flags.includes('ADMIN')) {
        const allowedStores = lst2.filter(item => item.type === 'Store' && tmStoreIds.includes(item.id));
        const allowedAddressIds = [...new Set(allowedStores.map(s => s.parent_id))];
        const allowedAddresses = lst2.filter(item => item.type === 'Address' && allowedAddressIds.includes(item.id));
        return [...allowedAddresses, ...allowedStores];
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

      let rlst3 = rlst2.map((item)=>{
        return lst2.filter((item2) => {
            return item2.id == item.id;
        })[0];
      }).filter(Boolean);

      // Определяем адресные группы только для магазинов пользователя
      const userAddressIds = new Set(rlst3.map(item => item.parent_id));
      rlst3.push(...lst2.filter((item) => {
        return item.type == 'Address' && userAddressIds.has(item.id);
      }));

      return rlst3;

  }

  async getHierarchyItem(hid: number) {
    const item = await this.itemsRepository.findOne({ where: { id: hid } });
    if (!item) {
      return { status: 'error', message: 'Объект не найден' };
    }
    return { status: 'success', data: item };
  }

  async getProfile(authToken: string) {
    const tokenCheck = await this.checkToken(authToken);
    if (tokenCheck.status !== 'valid') return tokenCheck;

    const userId = tokenCheck.userId;
    const hierarchy = await this.itemsRepository.findOne({ where: { id: userId } });
    const logins = await this.loginRepository.find({ where: { hid: userId } });
    const profile = await this.userProfileRepository.findOne({ where: { hid: userId } });

    return {
      status: 'success',
      name: hierarchy?.name ?? '',
      logins: logins.map((l) => l.login),
      birthday: profile?.birthday ?? null,
      phone: profile?.phone ?? null,
    };
  }

  async updateProfile(authToken: string, data: { birthday?: string | null; phone?: string | null }) {
    const tokenCheck = await this.checkToken(authToken);
    if (tokenCheck.status !== 'valid') return tokenCheck;

    const userId = tokenCheck.userId;
    let profile = await this.userProfileRepository.findOne({ where: { hid: userId } });

    if (!profile) {
      profile = this.userProfileRepository.create({ hid: userId });
    }

    if (data.birthday !== undefined) {
      profile.birthday = data.birthday ? new Date(data.birthday) : null;
    }
    if (data.phone !== undefined) {
      profile.phone = data.phone || null;
    }

    await this.userProfileRepository.save(profile);
    return { status: 'success' };
  }

  async changePassword(authToken: string, oldHashedPassword: string, newHashedPassword: string) {
    const tokenCheck = await this.checkToken(authToken);
    if (tokenCheck.status !== 'valid') return tokenCheck;

    const userId = tokenCheck.userId;

    const loginWithOldPassword = await this.loginRepository.findOne({
      where: { hid: userId, hashedpassword: oldHashedPassword },
    });

    if (!loginWithOldPassword) {
      return { status: 'error', message: 'Неверный текущий пароль' };
    }

    await this.loginRepository.update({ hid: userId }, { hashedpassword: newHashedPassword });

    return { status: 'success', message: 'Пароль успешно изменён' };
  }

  async login(login: string, hashedpassword: string) {
    // Ищем пользователя по логину и хешу пароля
    const user = await this.loginRepository.findOne({
      where: { login, hashedpassword },
    });
    if (!user) {
      return {
        status: 'error',
        message: 'Неверный логин или пароль',
      };
    }
    // Генерируем новый токен из 16 случайных символов
    const newToken = Math.random().toString(36).substring(2, 18);
    const expiredDate = new Date();
    expiredDate.setHours(expiredDate.getHours() + 72); // Токен действителен 3 дня
    // Сохраняем токен в базе данных
    const tokenEntity = this.tokenRepository.create({
      token: newToken,
      user_id: user.hid,
      expired: expiredDate,
    });
    await this.tokenRepository.save(tokenEntity);
    return {
      status: 'success',
      message: 'Успешный вход',
      token: newToken,
      userId: user.hid,
    };

  }
}
