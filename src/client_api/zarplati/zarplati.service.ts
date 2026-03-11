import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from 'src/db/token.entity';
import { M_for_zarplati } from 'src/db/m_for_zarplati.entity';
import { Hierarchy } from 'src/db/hierarchy.entity';
import { Ebal_cost } from 'src/db/ebal_cost.entity';
import { Ter_man_list } from 'src/db/ter_man_list.entity';

@Injectable()
export class ZarplatiService {
    constructor(
        @InjectRepository(Token)
        private tokenRepository: Repository<Token>,

        @InjectRepository(M_for_zarplati)
        private mForZarplatiRepository: Repository<M_for_zarplati>,

        @InjectRepository(Hierarchy)
        private hierarchyRepository: Repository<Hierarchy>,

        @InjectRepository(Ebal_cost)
        private ebalCostRepository: Repository<Ebal_cost>,

        @InjectRepository(Ter_man_list)
        private terManListRepository: Repository<Ter_man_list>, // список территориальных менеджеров учитываемых при расчете.
    ) {}

    async checkToken(authToken: string) {
        let token = await this.tokenRepository.findOne({
            where: { token: authToken },
        });

        if (!token) {
            return {
                status: 'error',
                message: 'Неверный токен',
            };
        }

        if (token.expired < new Date()) {
            return {
                status: 'error',
                message: 'Токен истек',
            };
        }

        return {
            status: 'valid',
            userId: token.user_id,
        };
    }

    async getYearGrowth(hid: number, month: Date) {
        let r = await this.mForZarplatiRepository.findOne({
            where: { addr: hid, date: month }
        });
        let r2 = await this.mForZarplatiRepository.findOne({
            where: { addr: hid, date: new Date(month.getFullYear() - 1, month.getMonth(), 1) } }
        );
        if (!r || !r2) {
            return {
                status: 'error',
                message: 'Информация не найдена',
            };
        }
        // нужно вывести рост в процентах, значение этого периода и значение периода год назад
        let growth = ((r.s - r2.s) / r2.s) * 100;
        return {
            status: 'success',
            data: {
                growth: growth,
                current_value: r.s,
                previous_value: r2.s,
            },
        };
    }

    async getOwnHids(userId: number) {
        let hierarchies = await this.hierarchyRepository.find({
            where: { parent_id: userId },
        });
        if (!hierarchies || hierarchies.length === 0) {
            return {
                status: 'error',
                message: 'Информация не найдена',
            };
        }
        return {
            status: 'success',
            items: hierarchies,
        };
    }

    async getSummaryGrowth(hid: number, month: Date): Promise<{ status: string; data?: { summary_growth: number, details: any[] }; message?: string }> {
        let ownHidsResult = await this.getOwnHids(hid);
        if (ownHidsResult.status !== 'success') {
            return ownHidsResult;
        }
        let ownHids = ownHidsResult.items;
        let growths = [];
        for (let h of ownHids) {
            let growthResult = await this.getYearGrowth(h.id, month);
            if (growthResult.status === 'success') {
                growths.push({
                    item: h, // полный объект иерархии, а не только id
                    growth: growthResult.data.growth,
                    current_value: growthResult.data.current_value,
                    previous_value: growthResult.data.previous_value,
                });
            }
        }
        // сдесь формула которая назначает одно очко за каждый процент роста вплодь до 15 процентов и отнимает одно очко за каждый процент падения вплодь до 10 процентов.
        // так же сортируем адреса по убыванию роста
        // обязательно нужно вернуть полные объекты адресов.
        growths.sort((a, b) => b.growth - a.growth);
        let summaryGrowth = growths.reduce((acc, g) => {
            if (g.growth > 0) {
                acc += Math.min(g.growth, 15);
            } else {
                acc += Math.max(g.growth, -10);
            }
            return acc;
        }, 0);
        return {
            status: 'success',
            data: {
                summary_growth: summaryGrowth,
                details: growths,
            },
        };
    }

    async getAttendanceAddress(hid: number, month: Date) {
        // пока возвращаем 3 нуля за начало месяца, середину и конец, так как нет данных для расчета посещаемости
        return {
            status: 'success',
            data: {
                attendance: [0,0,0],
            },
        };
    }

    async getAttendanceSummary(hid: number, month: Date): Promise<{ status: string; data?: any; message?: string }> {
        // выводим для каждого адреса 
        let ownHidsResult = await this.getOwnHids(hid);
        if (ownHidsResult.status !== 'success') {
            return ownHidsResult;
        }
        let ownHids = ownHidsResult.items;
        let attendance = [];
        for (let h of ownHids) {
            let attendanceResult = await this.getAttendanceAddress(h.id, month);
            if (attendanceResult.status !== 'success') {
                return attendanceResult;
            }
            attendance.push({
                item: h,
                attendance: attendanceResult.data.attendance,
            });
        }
        return {
            status: 'success',
            data: attendance,
        };
    }

    async getDistanceAdress(hid: number, month: Date) {
        // Это надбавка за удалённость адреса от центра. Пока возвращаем 0, так как нет данных для расчета удалённости
        return {
            status: 'success',
            data: {
                distance: 0,
            },
        };
    }

    async getDistanceSummary(hid: number, month: Date): Promise<{ status: string; data?: any; message?: string }> {
        // выводим для каждого адреса
        let ownHidsResult = await this.getOwnHids(hid); 
        if (ownHidsResult.status !== 'success') {
            return ownHidsResult;
        }
        let ownHids = ownHidsResult.items;
        let distances = [];
        for (let h of ownHids) {
            let distanceResult = await this.getDistanceAdress(h.id, month);
            if (distanceResult.status !== 'success') {
                return distanceResult;
            }
            distances.push({
                item: h,
                distance: distanceResult.data.distance,
            });
        }
        return {
            status: 'success',
            data: distances,
        };
    }

    async getAdditions(hid: number, month: Date): Promise<{ status: string; data?: any[]; message?: string }> {
        // Это надбавки за определённые условия, например за работу в праздничные дни. Пока возвращаем пустой список, так как нет данных для расчета надбавок
        return {
            status: 'success',
            data: [],
        };
    }

    async getSummary(hid: number, month: Date) {
        let growthResult = await this.getSummaryGrowth(hid, month);
        if (growthResult.status !== 'success') {
            return growthResult;
        }
        let attendanceResult = await this.getAttendanceSummary(hid, month);
        if (attendanceResult.status !== 'success') {
            return attendanceResult;
        }
        let distanceResult = await this.getDistanceSummary(hid, month);
        if (distanceResult.status !== 'success') {
            return distanceResult;
        }
        let additionsResult = await this.getAdditions(hid, month);
        if (additionsResult.status !== 'success') {
            return additionsResult;
        }
        let person = await this.hierarchyRepository.findOne({
            where: { id: hid },
        });
        if (!person) {
            return {
                status: 'error',
                message: 'Информация не найдена',
            };
        }
        // суммируем баллы и сортируем по убыванию, так же возвращаем детали расчета для каждого адреса



        let summary = growthResult.data.summary_growth + attendanceResult.data.reduce((acc, a) => acc + a.attendance.reduce((acc2, v) => acc2 + v, 0), 0) + distanceResult.data.reduce((acc, d) => acc + d.distance, 0) + additionsResult.data.reduce((acc, a) => acc + a.points, 0);
        return {
            status: 'success',
            data: {
                summary: summary,
                person: person,
                details: {
                    growth: growthResult.data.details,
                    attendance: attendanceResult.data,
                    distance: distanceResult.data,
                    additions: additionsResult.data,
                },
            },
        };
    }

    async culcEbalCost(month: Date) {
        try {
        // Это стоимость одного условного балла. 55000 за человека делим на общее количество баллов.
        // Получаем всех сотрудников и их баллы за месяц
        let allPersons = await this.terManListRepository.find();
        let totalPoints = 0;
        for (let person of allPersons) {
            let summaryResult = await this.getSummary(person.hid, month);
            if (summaryResult.status === 'success') {
                totalPoints += summaryResult.data.summary;
            }
        }
        // Calculate the cost of one conditional point
        let ebalCost = 55000 / totalPoints;
        // Сохраняем стоимость в базу данных
        let ebalCostEntity = new Ebal_cost();
        ebalCostEntity.date = month;
        ebalCostEntity.value = ebalCost;
        await this.ebalCostRepository.save(ebalCostEntity);
        return {
            status: 'success',
            data: ebalCost,
        };
        } catch (error) {
            return {error: error}
        }
    }

    async getPersonesList(month: Date) {
        // Получаем всех сотрудников и их баллы за месяц, сортируем по убыванию и возвращаем
        let allPersons = await this.terManListRepository.find();
        let personsWithPoints = [];
        for (let person of allPersons) {
            let summaryResult = await this.getSummary(person.hid, month);
            if (summaryResult.status === 'success') {
                personsWithPoints.push({
                    person: summaryResult.data.person,
                    summary: summaryResult.data.summary,
                });
            }
        }
        // Сортируем по убыванию баллов
        personsWithPoints.sort((a, b) => b.summary - a.summary);
        // считаем их надбавку к зарплате, умножая баллы на стоимость одного условного балла
        let ebalCostResult = await this.ebalCostRepository.findOne({
            where: { date: month },
        });
        if (!ebalCostResult) {
            return {
                status: 'error',
                message: 'Стоимость балла не найдена',
            };
        }
        let ebalCost = ebalCostResult.value;
        personsWithPoints = personsWithPoints.map(p => {
            return {
                person: p.person,
                summary: p.summary,
                addition: p.summary * ebalCost,
            };
        });
        return {
            status: 'success',
            data: personsWithPoints,
        };
    }
}
