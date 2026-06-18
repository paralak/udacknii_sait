import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Personal_ls_info } from 'src/db/personal/personal_ls_info.entity';
import { Personal_pos } from 'src/db/personal/personal_pos.entity';
import { Personal_ls } from 'src/db/personal/personal_ls.entity';
import { ManagerLsReport } from 'src/db/personal/manager_ls_report.entity';
import { Token } from 'src/db/token.entity';
import { Hierarchy } from 'src/db/hierarchy.entity';
import { Flags } from 'src/db/flags.entity';
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

        @InjectRepository(ManagerLsReport)
        private managerLsReportRepository: Repository<ManagerLsReport>,

        @InjectRepository(Token)
        private tokenRepository: Repository<Token>,

        @InjectRepository(Hierarchy)
        private hierarchyRepository: Repository<Hierarchy>,

        @InjectRepository(Flags)
        private flagsRepository: Repository<Flags>,
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

    private getSubtreeIds(hierarchy: Hierarchy[], rootId: number): Set<number> {
        const result = new Set<number>();
        result.add(rootId);
        const queue = [rootId];
        while (queue.length > 0) {
            const current = queue.shift()!;
            hierarchy.filter(h => h.parent_id === current).forEach(child => {
                result.add(child.id);
                queue.push(child.id);
            });
        }
        return result;
    }

    async getViewStores(headers: Record<string, string>) {
        const check = await this.checkToken(headers);
        if (check.status !== 'valid') return check;

        const managerHid: number = check.userId;
        const flags = await this.flagsRepository.find({ where: { hid: managerHid } });
        const flagValues = flags.map(f => f.flag);

        if (!flagValues.includes('MANAGER') && !flagValues.includes('ADMIN')) {
            return { status: 'error', message: 'Нет доступа' };
        }

        const allHierarchy = await this.hierarchyRepository.find();
        let accessibleStoreHids: number[] = [];

        if (flagValues.includes('ADMIN')) {
            accessibleStoreHids = allHierarchy.filter(h => h.type === 'Store').map(h => h.id);
        } else {
            const tmStoreIds = flagValues
                .filter(f => /^TM_\d+$/.test(f))
                .map(f => parseInt(f.replace('TM_', '')));
            if (tmStoreIds.length > 0) {
                accessibleStoreHids = tmStoreIds;
            } else {
                const managerNode = allHierarchy.find(h => h.id === managerHid);
                if (managerNode && managerNode.parent_id > 0) {
                    const subtreeIds = this.getSubtreeIds(allHierarchy, managerNode.parent_id);
                    accessibleStoreHids = allHierarchy
                        .filter(h => h.type === 'Store' && subtreeIds.has(h.id))
                        .map(h => h.id);
                }
                if (accessibleStoreHids.length === 0) {
                    accessibleStoreHids = allHierarchy.filter(h => h.type === 'Store').map(h => h.id);
                }
            }
        }

        const allPositions = await this.personalPosRepository.find();
        const allLs = await this.personalLsRepository.find();

        const storeHidsWithPositions = [...new Set(
            allPositions.filter(p => accessibleStoreHids.includes(p.hid)).map(p => p.hid)
        )];

        const stores: any[] = [];
        for (const storeHid of storeHidsWithPositions) {
            const storeNode = allHierarchy.find(h => h.id === storeHid);

            const latestReport = await this.managerLsReportRepository
                .createQueryBuilder('r')
                .where('r.store_hid = :storeHid', { storeHid })
                .orderBy('r.filled_at', 'DESC')
                .getOne();

            const storePositions = allPositions.filter(p => p.hid === storeHid);
            const reportPositions: any[] = latestReport
                ? ((latestReport.data as any)?.positions || [])
                : [];

            const positions = storePositions.map(pos => {
                const reportPos = reportPositions.find((rp: any) => rp.id === pos.id);
                const ls = pos.lsid ? allLs.find(l => l.lsid === pos.lsid) : null;
                const staffInfo = reportPos?.staff ? {
                    birthDate: reportPos.staff.birthDate || null,
                    citizenship: reportPos.staff.citizenship || null,
                    contractType: reportPos.staff.contractType || null,
                    maritalStatus: reportPos.staff.maritalStatus || null,
                    children: reportPos.staff.children || null,
                    vacationStart: reportPos.staff.vacationStart || null,
                    vacationEnd: reportPos.staff.vacationEnd || null,
                    phone: reportPos.staff.phone || null,
                    address: reportPos.staff.address || null,
                    phoneBackup: reportPos.staff.phoneBackup || null,
                    departureDate: reportPos.staff.departureDate || null,
                } : null;

                return {
                    id: pos.id,
                    name: pos.name,
                    staffName: reportPos?.staff?.fio || ls?.fio || null,
                    staffInfo,
                };
            });

            stores.push({
                hid: storeHid,
                name: storeNode?.name || `Магазин ${storeHid}`,
                lastFilledAt: latestReport?.filled_at || null,
                positions,
            });
        }

        stores.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
        return { status: 'success', stores };
    }

    async getManagerStores(headers: Record<string, string>) {
        const check = await this.checkToken(headers);
        if (check.status !== 'valid') return check;

        const managerHid: number = check.userId;
        const flags = await this.flagsRepository.find({ where: { hid: managerHid } });
        const flagValues = flags.map(f => f.flag);

        if (!flagValues.includes('MANAGER') && !flagValues.includes('ADMIN')) {
            return { status: 'error', message: 'Нет доступа' };
        }

        const allHierarchy = await this.hierarchyRepository.find();
        let accessibleStoreHids: number[] = [];

        if (flagValues.includes('ADMIN')) {
            accessibleStoreHids = allHierarchy
                .filter(h => h.type === 'Store')
                .map(h => h.id);
        } else {
            const tmStoreIds = flagValues
                .filter(f => /^TM_\d+$/.test(f))
                .map(f => parseInt(f.replace('TM_', '')));

            if (tmStoreIds.length > 0) {
                accessibleStoreHids = tmStoreIds;
            } else {
                // MANAGER without TM flags: try hierarchy traversal, fall back to all stores
                const managerNode = allHierarchy.find(h => h.id === managerHid);
                if (managerNode && managerNode.parent_id > 0) {
                    const subtreeIds = this.getSubtreeIds(allHierarchy, managerNode.parent_id);
                    accessibleStoreHids = allHierarchy
                        .filter(h => h.type === 'Store' && subtreeIds.has(h.id))
                        .map(h => h.id);
                }
                if (accessibleStoreHids.length === 0) {
                    accessibleStoreHids = allHierarchy
                        .filter(h => h.type === 'Store')
                        .map(h => h.id);
                }
            }
        }

        const allPositions = await this.personalPosRepository.find();
        const storeHidsWithPositions = [...new Set(
            allPositions
                .filter(p => accessibleStoreHids.includes(p.hid))
                .map(p => p.hid)
        )];

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayReports = await this.managerLsReportRepository
            .createQueryBuilder('r')
            .where('r.manager_hid = :managerHid', { managerHid })
            .andWhere('r.filled_at >= :today', { today })
            .andWhere('r.filled_at < :tomorrow', { tomorrow })
            .getMany();

        const filledTodayHids = new Set(todayReports.map(r => r.store_hid));

        const lastReportMap = new Map<number, Date | null>();
        for (const storeHid of storeHidsWithPositions) {
            const lastReport = await this.managerLsReportRepository
                .createQueryBuilder('r')
                .where('r.store_hid = :storeHid', { storeHid })
                .andWhere('r.manager_hid = :managerHid', { managerHid })
                .orderBy('r.filled_at', 'DESC')
                .getOne();
            lastReportMap.set(storeHid, lastReport?.filled_at || null);
        }

        const allLs = await this.personalLsRepository.find();
        const allInfo = await this.personalLsInfoRepository.find();

        const stores: any[] = [];
        for (const storeHid of storeHidsWithPositions) {
            const storeNode = allHierarchy.find(h => h.id === storeHid);

            const latestReport = await this.managerLsReportRepository
                .createQueryBuilder('r')
                .where('r.store_hid = :storeHid', { storeHid })
                .orderBy('r.filled_at', 'DESC')
                .getOne();

            const reportStaffMap = new Map<number, { lsid: string; staff: any }>();
            if (latestReport) {
                const rPositions: any[] = (latestReport.data as any)?.positions || [];
                for (const rp of rPositions) {
                    if (rp.id && rp.lsid && rp.staff) {
                        reportStaffMap.set(rp.id, { lsid: rp.lsid, staff: rp.staff });
                    }
                }
            }

            const positions = allPositions
                .filter(p => p.hid === storeHid)
                .map(p => {
                    const staff = p.lsid ? allLs.find(ls => ls.lsid === p.lsid) || null : null;
                    const staffInfo = p.lsid ? allInfo.filter(i => i.lsid === p.lsid) : [];
                    const reportEntry = reportStaffMap.get(p.id);
                    const reportStaff = (reportEntry && reportEntry.lsid === p.lsid)
                        ? reportEntry.staff
                        : null;
                    return { ...p, staff, staffInfo, reportStaff };
                });

            stores.push({
                hid: storeHid,
                name: storeNode?.name || `Магазин ${storeHid}`,
                lastFilledAt: lastReportMap.get(storeHid) || null,
                filledToday: filledTodayHids.has(storeHid),
                positions,
            });
        }

        stores.sort((a, b) => {
            if (!a.filledToday && b.filledToday) return -1;
            if (a.filledToday && !b.filledToday) return 1;
            if (!a.lastFilledAt && !b.lastFilledAt) return 0;
            if (!a.lastFilledAt) return -1;
            if (!b.lastFilledAt) return 1;
            return new Date(a.lastFilledAt).getTime() - new Date(b.lastFilledAt).getTime();
        });

        return {
            status: 'success',
            stores,
            totalFilledToday: filledTodayHids.size,
            totalStores: storeHidsWithPositions.length,
        };
    }

    async saveManagerStore(
        storeHid: number,
        positions: any[],
        headers: Record<string, string>,
    ) {
        const check = await this.checkToken(headers);
        if (check.status !== 'valid') return check;

        const managerHid: number = check.userId;

        for (const pos of positions) {
            if (pos.delete && pos.id) {
                const existing = await this.personalPosRepository.findOne({ where: { id: pos.id } });
                if (existing) {
                    const lsList = await this.personalLsRepository.find({ where: { pos_id: pos.id } });
                    for (const ls of lsList) {
                        ls.pos_id = null;
                        await this.personalLsRepository.save(ls);
                    }
                    await this.personalPosRepository.remove(existing);
                }
                continue;
            }

            let posEntity: Personal_pos;
            if (pos.id) {
                posEntity = await this.personalPosRepository.findOne({ where: { id: pos.id } });
                if (!posEntity) continue;
                posEntity.name = pos.name;
            } else {
                posEntity = this.personalPosRepository.create({ hid: storeHid, name: pos.name });
                posEntity = await this.personalPosRepository.save(posEntity);
            }

            if (pos.lsid) {
                const ls = await this.personalLsRepository.findOne({ where: { lsid: pos.lsid } });
                if (ls) {
                    const prevOwners = await this.personalLsRepository.find({ where: { pos_id: posEntity.id } });
                    for (const prev of prevOwners) {
                        if (prev.lsid !== pos.lsid) {
                            prev.pos_id = null;
                            await this.personalLsRepository.save(prev);
                        }
                    }
                    const oldPos = await this.personalPosRepository.findOne({ where: { lsid: pos.lsid } });
                    if (oldPos && oldPos.id !== posEntity.id) {
                        oldPos.lsid = null;
                        await this.personalPosRepository.save(oldPos);
                    }
                    posEntity.lsid = pos.lsid;
                    ls.pos_id = posEntity.id;
                    await this.personalLsRepository.save(ls);

                    if (pos.staff) {
                        if (pos.staff.fio) ls.fio = pos.staff.fio;
                        await this.personalLsRepository.save(ls);

                        const LABEL_MAP: Record<string, string> = {
                            birthDate: 'Дата ррождения',
                            citizenship: 'Ггражданство',
                            contractType: 'Ттип отношений',
                            maritalStatus: 'Семейное положение',
                            children: 'Дети',
                            vacationStart: 'Начало отпуска',
                            vacationEnd: 'Конец отпуска',
                            phone: 'Телефон',
                            address: 'Адрес',
                            phoneBackup: 'Запасной телефон',
                            departureDate: 'Дата ухода',
                        };

                        for (const [key, label] of Object.entries(LABEL_MAP)) {
                            const value = pos.staff[key];
                            if (value === undefined) continue;
                            const existing = await this.personalLsInfoRepository.findOne({
                                where: { lsid: pos.lsid, label },
                            });
                            if (existing) {
                                existing.value = value || '';
                                await this.personalLsInfoRepository.save(existing);
                            } else if (value) {
                                const newInfo = this.personalLsInfoRepository.create({
                                    lsid: pos.lsid,
                                    label,
                                    value,
                                    type: 'Текст',
                                });
                                await this.personalLsInfoRepository.save(newInfo);
                            }
                        }
                    }
                }
            } else {
                const prevOwners = await this.personalLsRepository.find({ where: { pos_id: posEntity.id } });
                for (const prev of prevOwners) {
                    prev.pos_id = null;
                    await this.personalLsRepository.save(prev);
                }
                posEntity.lsid = null;
            }

            await this.personalPosRepository.save(posEntity);
        }

        const snapshot = positions.map(p => ({
            id: p.id,
            name: p.name,
            delete: p.delete,
            lsid: p.lsid,
            staff: p.staff || null,
        }));

        const report = this.managerLsReportRepository.create({
            store_hid: storeHid,
            manager_hid: managerHid,
            filled_at: new Date(),
            data: { positions: snapshot },
        });
        await this.managerLsReportRepository.save(report);

        return { status: 'success' };
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
