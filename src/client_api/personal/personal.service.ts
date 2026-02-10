import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Personal_ls_info } from 'src/db/personal/personal_ls_info.entity';
import { Personal_pos } from 'src/db/personal/personal_pos.entity';
import { Personal_ls } from 'src/db/personal/personal_ls.entity';
import { Token } from 'src/db/token.entity';
import { PersonalInfoDTO } from 'src/db/dto/personal_info.dto';
import { PersonalPosDTO } from 'src/db/dto/personal_pos.dto';
import { PersonalLsDTO } from 'src/db/dto/personal_ls.dto';

@Injectable()
export class PersonalService {
    constructor(
        @InjectRepository(Personal_ls_info)
        private personalLsInfoRepository: Repository<Personal_ls_info>,

        @InjectRepository(Personal_pos)
        private personalPosRepository: Repository<Personal_pos>,

        @InjectRepository(Personal_ls)
        private personalLsRepository: Repository<Personal_ls>,

        @InjectRepository(Token)
        private tokenRepository: Repository<Token>,
    ) {}

    async getInfo(lsid: string | undefined, headers: Record<string, string>) {
        const checkResponse = await this.checkToken(headers);
        if (checkResponse.status !== 'valid') {
            return checkResponse;
        }
        

        const lsInfo = await this.personalLsInfoRepository.find({ where: { lsid: lsid } });

        return {
            status: 'success',
            lsInfo: lsInfo,
        }
    }

    async addInfo(info: PersonalInfoDTO, headers: Record<string, string>) {
        const checkResponse = await this.checkToken(headers);
        if (checkResponse.status !== 'valid') {
            return checkResponse;
        }

        const newInfo = this.personalLsInfoRepository.create({
            lsid: info.lsid,
            label: info.label,
            value: info.value,
            type: info.type,
        });

        return await this.personalLsInfoRepository.save(newInfo);
    }

    async updateInfo(info: PersonalInfoDTO, headers: Record<string, string>) {
        const checkResponse = await this.checkToken(headers);
        if (checkResponse.status !== 'valid') {
            return checkResponse;
        }

        const existingInfo = await this.personalLsInfoRepository.findOne({ where: { id: info.id } });
        if (!existingInfo) {
            return {
                status: 'error',
                message: 'Информация не найдена',
            };
        }

        existingInfo.label = info.label;
        existingInfo.value = info.value;
        existingInfo.type = info.type;

        return await this.personalLsInfoRepository.save(existingInfo);
    }

    async deleteInfo(id: number, headers: Record<string, string>) {
        const checkResponse = await this.checkToken(headers);
        if (checkResponse.status !== 'valid') {
            return checkResponse;
        }

        const existingInfo = await this.personalLsInfoRepository.findOne({ where: { id: id } });
        if (!existingInfo) {
            return {
                status: 'error',
                message: 'Информация не найдена',
            };
        }

        await this.personalLsInfoRepository.remove(existingInfo);
        return {
            status: 'success',
            message: 'Информация удалена',
        };
    }


    async checkToken(headers: Record<string, string>) {
        const cookieHeader = headers['cookie'];
        
        if (cookieHeader) {
            // Используем регулярное выражение для поиска auth_token
            const match = cookieHeader.match(/auth_token=([^;]+)/);
            
            if (match) {
                var authToken = match[1];
                console.log('Auth token:', authToken);
            } else {
                return {
                    status: 'error',
                    message: 'Токен не предоставлен',
                };
            }
        } else {
            return {
                status: 'error',
                message: 'Токен не предоставлен',
            };
        }

        const token = await this.tokenRepository.findOne({
            where: { token: authToken },
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

    async getPos(hid: number, headers: Record<string, string>) {
        const checkResponse = await this.checkToken(headers);
        if (checkResponse.status !== 'valid') {
            return checkResponse;
        }

        const positions = await this.personalPosRepository.find({ where: { hid: hid } });

        return {
            status: 'success',
            positions: positions,
        };
    }

    async getAllPos(headers: Record<string, string>) {
        const checkResponse = await this.checkToken(headers);
        if (checkResponse.status !== 'valid') {
            return checkResponse;
        }

        const positions = await this.personalPosRepository.find();

        // Сначала не занятые должности, потом занятые
        positions.sort((a, b) => {
            if (a.lsid === null && b.lsid !== null) {
                return -1; // a идет раньше b
            } else if (a.lsid !== null && b.lsid === null) {
                return 1; // b идет раньше a
            } else {
                return 0; // порядок не изменяется
            }
        });

        return {
            status: 'success',
            positions: positions,
        };
    }

    async addPos(pos: PersonalPosDTO, headers: Record<string, string>) {
        const checkResponse = await this.checkToken(headers);
        if (checkResponse.status !== 'valid') {
            return checkResponse;
        }

        const newPos = this.personalPosRepository.create({
            hid: pos.hid,
            name: pos.name,
        });

        return await this.personalPosRepository.save(newPos);
    }

    async updatePos(pos: PersonalPosDTO, headers: Record<string, string>) {
        const checkResponse = await this.checkToken(headers);
        if (checkResponse.status !== 'valid') {
            return checkResponse;
        }

        const existingPos = await this.personalPosRepository.findOne({ where: { id: pos.id } });
        if (!existingPos) {
            return {
                status: 'error',
                message: 'Должность не найдена',
            };
        }

        // Если задан lsid, проверяем, что такой линейный сотрудник существует
        if (pos.lsid) {
            const ls = await this.personalLsRepository.findOne({ where: { lsid: pos.lsid } });
            if (!ls) {
                return {
                    status: 'error',
                    message: 'Линейный сотрудник с таким lsid не найден',
                };
            }
        }

        existingPos.name = pos.name;
        existingPos.lsid = pos.lsid;

        // По lsid находим линейного сотрудника и сохраняем его вакансию
        if (pos.lsid) {
            const ls = await this.personalLsRepository.findOne({ where: { lsid: pos.lsid } });
            if (ls) {
                ls.pos_id = existingPos.id;
                await this.personalLsRepository.save(ls);
            }
        }

        // Обновляем должность у всех линейных сотрудников, которые занимают эту должность, кроме того, который был указан в pos.lsid
        const lsList = await this.personalLsRepository.find({ where: { pos_id: existingPos.id } }); 
        for (const ls of lsList) {
            if (ls.lsid !== pos.lsid) {
                ls.pos_id = null;
                await this.personalLsRepository.save(ls);
            }
        }

        return await this.personalPosRepository.save(existingPos);
    }

    async deletePos(id: number, headers: Record<string, string>) {
        const checkResponse = await this.checkToken(headers);
        if (checkResponse.status !== 'valid') {
            return checkResponse;
        }

        const existingPos = await this.personalPosRepository.findOne({ where: { id: id } });
        if (!existingPos) {
            return {
                status: 'error',
                message: 'Должность не найдена',
            };
        }

        // Перед удалением должности, обнуляем pos_id у всех линейных сотрудников, которые занимают эту должность
        const lsList = await this.personalLsRepository.find({ where: { pos_id: id } });
        for (const ls of lsList) {
            ls.pos_id = null;
            await this.personalLsRepository.save(ls);
        }

        await this.personalPosRepository.remove(existingPos);
        return {
            status: 'success',
            message: 'Должность удалена',
        };
    }

    async getLs(lsid:string, headers: Record<string, string>) {
        const checkResponse = await this.checkToken(headers);
        if (checkResponse.status !== 'valid') {
            return checkResponse;
        }

        const ls = await this.personalLsRepository.findOne({ where: { lsid: lsid } });

        return {
            status: 'success',
            ls: ls,
        };
    }

    async getAllLs(headers: Record<string, string>) {
        const checkResponse = await this.checkToken(headers);
        if (checkResponse.status !== 'valid') {
            return checkResponse;
        }

        const lsList = await this.personalLsRepository.find();
        // Сначала не занятые линейные сотрудники, потом занятые
        lsList.sort((a, b) => {
            if (a.pos_id === null && b.pos_id !== null) {
                return -1; // a идет раньше b
            }
            else if (a.pos_id !== null && b.pos_id === null) {
                return 1; // b идет раньше a
            }
            else {
                return 0; // порядок не изменяется
            }
        });

        return {
            status: 'success',
            lsList: lsList,
        };
    }

    async addLs(ls: PersonalLsDTO, headers: Record<string, string>) {
        const checkResponse = await this.checkToken(headers);
        if (checkResponse.status !== 'valid') {
            return checkResponse;
        }

        //lsid нужно сгенерировать в формате "ls" + число, где число - это максимальное существующее число в lsid + 1
        const existingLsList = await this.personalLsRepository.find();
        let maxNumber = 0;
        existingLsList.forEach((existingLs) => {
            const numberPart = parseInt(existingLs.lsid.replace('ls', ''));
            if (numberPart > maxNumber) {
                maxNumber = numberPart;
            }
        });
        const newLsid = 'ls' + (maxNumber + 1);

        // нельзя при создании линейного сотрудника указывать pos_id, так как должность может быть уже занята другим линейным сотрудником, нужно сначала создать линейного сотрудника, а потом уже обновить должность, указав lsid нового линейного сотрудника

        const newLs = this.personalLsRepository.create({
            lsid: newLsid,
            fio: ls.fio,
            doe: ls.doe,
            pos_id: null,
        });

        return await this.personalLsRepository.save(newLs);
    }

    async updateLs(ls: PersonalLsDTO, headers: Record<string, string>) {
        const checkResponse = await this.checkToken(headers);
        if (checkResponse.status !== 'valid') {
            return checkResponse;
        }

        const existingLs = await this.personalLsRepository.findOne({ where: { lsid: ls.lsid } });
        if (!existingLs) {
            return {
                status: 'error',
                message: 'Линейный сотрудник не найден',
            };
        }

        existingLs.fio = ls.fio;
        existingLs.doe = ls.doe;

        // нельзя меня pos_id у линейного сотрудника напрямую, для этого нужно обновлять должность, указав lsid линейного сотрудника, тогда в сервисе будет логика, которая будет обнулять pos_id у всех остальных линейных сотрудников, которые занимают эту должность, и ставить pos_id у текущего линейного сотрудника
        
        return await this.personalLsRepository.save(existingLs);
    }

    async deleteLs(lsid: string, headers: Record<string, string>) {
        const checkResponse = await this.checkToken(headers);
        if (checkResponse.status !== 'valid') {
            return checkResponse;
        }

        const existingLs = await this.personalLsRepository.findOne({ where: { lsid: lsid } });
        if (!existingLs) {
            return {
                status: 'error',
                message: 'Линейный сотрудник не найден',
            };
        }

        // Перед удалением линейного сотрудника, обнуляем pos_id у должности, которую занимает этот линейный сотрудник
        if (existingLs.pos_id) {
            const pos = await this.personalPosRepository.findOne({ where: { id: existingLs.pos_id } });
            if (pos) {
                pos.lsid = null;
                await this.personalPosRepository.save(pos);

                existingLs.pos_id = null;
                await this.personalLsRepository.save(existingLs);

            }

        }

        await this.personalLsRepository.remove(existingLs);
        return {
            status: 'success',
            message: 'Линейный сотрудник удален',
        };
    }
}
