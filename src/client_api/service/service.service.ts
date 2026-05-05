import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from 'src/db/token.entity';
import { Service_reg } from 'src/db/service_reg.entity';
import { Service_log } from 'src/db/service_log.entity';
import { Service_types } from 'src/db/serice_types.entity';

@Injectable()
export class ServiceService {
    constructor(
        @InjectRepository(Token)
        private tokenRepository: Repository<Token>,
        @InjectRepository(Service_reg)
        private serviceRegRepository: Repository<Service_reg>,
        @InjectRepository(Service_log)
        private serviceLogRepository: Repository<Service_log>,
        @InjectRepository(Service_types)
        private serviceTypesRepository: Repository<Service_types>,
    ) {}

    async checkToken(headers: Record<string, string>) {
        const cookieHeader = headers['cookie'];
        if (!cookieHeader) {
            return {
                status: 'error',
                message: 'Токен не предоставлен',
            };
        }

        const match = cookieHeader.match(/auth_token=([^;]+)/);
        if (!match) {
            return {
                status: 'error',
                message: 'Токен не предоставлен',
            };
        }

        const authToken = match[1];
        const token = await this.tokenRepository.findOne({ where: { token: authToken } });

        if (!token) {
            return {
                status: 'not_found',
                message: 'Токен не найден',
            };
        }

        const now = new Date();
        const expiredDate = new Date(token.expired);

        if (expiredDate < now) {
            return {
                status: 'expired',
                message: 'Токен истёк',
                expiredAt: token.expired,
            };
        }

        return {
            status: 'valid',
            message: 'Токен действителен',
            userId: token.user_id,
            expiresAt: token.expired,
        };
    }

    async regService(headers: Record<string, string>, address: number, type: string, message: string) {
        const tokenCheck = await this.checkToken(headers);
        if (tokenCheck.status !== 'valid') {
            return tokenCheck;
        }
        const userId = tokenCheck.userId;

        // добавляем сервис в базу данных, сразу получаем его id
        // и добавляем лог с этим id

        const serviceReg = new Service_reg();
        serviceReg.type = type;
        serviceReg.address = address;
        const savedService = await this.serviceRegRepository.save(serviceReg);

        const serviceLog = new Service_log();
        serviceLog.reg_id = savedService.id;
        serviceLog.message = message;
        await this.serviceLogRepository.save(serviceLog);

        return {
            status: 'success',
            message: 'Сервис зарегистрирован',
        };
    }

    async getServices(headers: Record<string, string>) {
        const tokenCheck = await this.checkToken(headers);
        if (tokenCheck.status !== 'valid') {
            return tokenCheck;
        }
        // Получаем все зарегистрированные сервисы. Возвращаем их вместе с их логами
        const services = await this.serviceRegRepository.find();
        const servicesWithLogs = [];
        for (const service of services) {
            const logs = await this.serviceLogRepository.find({ where: { reg_id: service.id } });
            servicesWithLogs.push({
                ...service,
                logs,
            });
        }
        return servicesWithLogs;
    }

    async changeServiceStatus(headers: Record<string, string>, regId: number, type: string, message: string) {
        const tokenCheck = await this.checkToken(headers);
        if (tokenCheck.status !== 'valid') {
            return tokenCheck;
        }
        // добавляем лог с новым статусом для сервиса с id = regId
        const serviceLog = new Service_log();
        serviceLog.reg_id = regId;
        serviceLog.type = type;
        serviceLog.message = message;
        await this.serviceLogRepository.save(serviceLog);
        // также обновить статус сервиса в таблице service_reg
        await this.serviceRegRepository.update({ id: regId }, { type });

        return {
            status: 'success',
            message: 'Статус сервиса обновлён',
        };
    }

    async getServiceTypes(headers: Record<string, string>) {
        const tokenCheck = await this.checkToken(headers);
        if (tokenCheck.status !== 'valid') {
            return tokenCheck;
        }
        // Получаем все типы сервисов
        const types = await this.serviceTypesRepository.find();
        return types;
    }
}
