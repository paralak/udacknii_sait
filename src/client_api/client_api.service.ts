import {Injectable} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Exclusion, In, Repository } from 'typeorm';
import { Hierarchy } from 'src/db/hierarchy.entity';
import { Addresses } from 'src/db/addresses.entity';
import { Login } from 'src/db/login.entity';
import { Flags } from 'src/db/flags.entity';
import { UserProfile } from 'src/db/user_profile.entity';
import { signJwt, verifyJwt } from 'src/auth/jwt.util';


@Injectable()
export class ClientAPIService {
    constructor (
        @InjectRepository(Hierarchy)
        private readonly itemsRepository: Repository<Hierarchy>,
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
          // Полная иерархия: все департаменты, подразделения, магазины и сотрудники
          return this.itemsRepository.find({
              where: { type: In(['Department', 'Company', 'Store', 'Person']) },
              order: { sort_order: 'ASC', id: 'ASC' },
          });
      } else {
          // Только структура департаментов, подразделений и магазинов (без сотрудников)
          return this.itemsRepository.find({
              where: { type: In(['Department', 'Company', 'Store']) },
              order: { sort_order: 'ASC', id: 'ASC' },
          });
      }
  }

    async checkToken(tokenValue: string) {
    const payload = verifyJwt(tokenValue);
    if (!payload) {
      return { status: 'not_found', message: 'Токен не найден или истёк' };
    }
    const hidObj = this.itemsRepository.findOne({ where: { id: payload.sub } });
    const flags = await this.flagsRepository.find({ where: { hid: payload.sub } });
    return {
        status: 'valid',
        message: 'Токен действителен',
        userId: payload.sub,
        hidObj,
        flags: flags.map((f) => f.flag),
    };
  }

  async getAddressTree(authToken: string) {
    let lst = await this.itemsRepository.find({ order: { sort_order: 'ASC', id: 'ASC' } });
    let lst2 = await this.addressesRepository.find();
    let resp = await this.checkToken(authToken);
    if (resp.status != 'valid') {
        return resp;
    }

    // ADMIN видит все адреса
    if (resp.flags.includes('ADMIN')) {
        return lst2;
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
    try {
      const user = await this.loginRepository.findOne({
        where: { login, hashedpassword },
      });
      if (!user) {
        return { status: 'error', message: 'Неверный логин или пароль' };
      }
      const token = signJwt(user.hid);
      return {
        status: 'success',
        message: 'Успешный вход',
        token,
        userId: user.hid,
      };
    } catch (err: any) {
      console.error('[login] DB error:', err?.message, err?.stack);
      return { status: 'error', message: 'Ошибка сервера при входе' };
    }
  }
}
