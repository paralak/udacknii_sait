import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as webpush from 'web-push';
import { Token } from 'src/db/token.entity';
import { Service_reg } from 'src/db/service_reg.entity';
import { Service_log } from 'src/db/service_log.entity';
import { Service_types } from 'src/db/serice_types.entity';
import { Hierarchy } from 'src/db/hierarchy.entity';
import { PushSubscription } from 'src/db/push_subscription.entity';

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
        @InjectRepository(Hierarchy)
        private hierarchyRepository: Repository<Hierarchy>,
        @InjectRepository(PushSubscription)
        private pushSubscriptionRepository: Repository<PushSubscription>,
    ) {}

    async checkToken(headers: Record<string, string>) {
        const cookieHeader = headers['cookie'];
        if (!cookieHeader) {
            return { status: 'error', message: 'Токен не предоставлен' };
        }

        const match = cookieHeader.match(/auth_token=([^;]+)/);
        if (!match) {
            return { status: 'error', message: 'Токен не предоставлен' };
        }

        const authToken = match[1];
        const token = await this.tokenRepository.findOne({ where: { token: authToken } });

        if (!token) {
            return { status: 'not_found', message: 'Токен не найден' };
        }

        const now = new Date();
        if (new Date(token.expired) < now) {
            return { status: 'expired', message: 'Токен истёк', expiredAt: token.expired };
        }

        return {
            status: 'valid',
            message: 'Токен действителен',
            userId: token.user_id,
            expiresAt: token.expired,
        };
    }

    private async sendPushToHid(hid: number, title: string, body: string) {
        const subs = await this.pushSubscriptionRepository.find({ where: { hid } });
        if (!subs.length) return;

        if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
        webpush.setVapidDetails('mailto:admin@u-org.ru', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

        const payload = JSON.stringify({ title, body });
        await Promise.allSettled(subs.map(s =>
            webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                payload,
            ).catch(async err => {
                if (err.statusCode === 410) await this.pushSubscriptionRepository.delete({ id: s.id });
            })
        ));
    }

    async regService(headers: Record<string, string>, address: number, type: string, message: string) {
        const tokenCheck = await this.checkToken(headers);
        if (tokenCheck.status !== 'valid') return tokenCheck;
        const userId = tokenCheck.userId;

        const serviceReg = new Service_reg();
        serviceReg.type = type;
        serviceReg.address = address;
        const savedService = await this.serviceRegRepository.save(serviceReg);

        const serviceLog = new Service_log();
        serviceLog.reg_id = savedService.id;
        serviceLog.message = message;
        serviceLog.type = type;
        serviceLog.status = 'registered';
        serviceLog.timestamp = new Date();
        serviceLog.hid = userId;
        await this.serviceLogRepository.save(serviceLog);

        return { status: 'success', message: 'Сервис зарегистрирован' };
    }

    async getServices(headers: Record<string, string>) {
        const tokenCheck = await this.checkToken(headers);
        if (tokenCheck.status !== 'valid') return tokenCheck;

        const services = await this.serviceRegRepository.find();
        const servicesWithLogs = [];

        for (const service of services) {
            const logs = await this.serviceLogRepository.find({
                where: { reg_id: service.id },
                order: { timestamp: 'ASC' },
            });

            const creatorHid = logs[0]?.hid;
            let creatorName = '';
            if (creatorHid) {
                const person = await this.hierarchyRepository.findOne({ where: { id: creatorHid } });
                creatorName = person?.name || '';
            }

            servicesWithLogs.push({ ...service, logs, creatorName });
        }

        return servicesWithLogs;
    }

    async getMyServices(headers: Record<string, string>) {
        const tokenCheck = await this.checkToken(headers);
        if (tokenCheck.status !== 'valid') return tokenCheck;
        const userId = tokenCheck.userId;

        // Ищем логи пользователя со статусом 'registered' (первая запись при создании)
        const myFirstLogs = await this.serviceLogRepository.find({
            where: { hid: userId, status: 'registered' },
            order: { timestamp: 'ASC' },
        });

        if (!myFirstLogs.length) return [];

        const regIds = [...new Set(myFirstLogs.map(l => l.reg_id))];
        const services = await this.serviceRegRepository.find({ where: { id: In(regIds) } });

        const servicesWithLogs = [];
        for (const service of services) {
            const logs = await this.serviceLogRepository.find({
                where: { reg_id: service.id },
                order: { timestamp: 'ASC' },
            });
            // Только если этот пользователь создал заявку (первый лог)
            if (logs[0]?.hid === userId) {
                servicesWithLogs.push({ ...service, logs, creatorName: '' });
            }
        }

        return servicesWithLogs;
    }

    async replyToService(headers: Record<string, string>, regId: number, message: string) {
        const tokenCheck = await this.checkToken(headers);
        if (tokenCheck.status !== 'valid') return tokenCheck;

        const service = await this.serviceRegRepository.findOne({ where: { id: regId } });
        if (!service) return { status: 'error', message: 'Заявка не найдена' };

        const firstLog = await this.serviceLogRepository.findOne({
            where: { reg_id: regId },
            order: { timestamp: 'ASC' },
        });

        const replyLog = new Service_log();
        replyLog.reg_id = regId;
        replyLog.type = service.type;
        replyLog.message = message;
        replyLog.status = 'reply';
        replyLog.hid = tokenCheck.userId;
        replyLog.timestamp = new Date();
        await this.serviceLogRepository.save(replyLog);

        if (firstLog?.hid) {
            await this.sendPushToHid(
                firstLog.hid,
                'Ответ по заявке',
                `Получен ответ по заявке №${regId}: ${message}`,
            );
        }

        return { status: 'success', message: 'Ответ отправлен' };
    }

    async changeServiceStatus(headers: Record<string, string>, regId: number, type: string, message: string, status: string) {
        const tokenCheck = await this.checkToken(headers);
        if (tokenCheck.status !== 'valid') return tokenCheck;

        const serviceLog = new Service_log();
        serviceLog.reg_id = regId;
        serviceLog.type = type;
        serviceLog.message = message;
        serviceLog.status = status;
        serviceLog.hid = tokenCheck.userId;
        serviceLog.timestamp = new Date();
        await this.serviceLogRepository.save(serviceLog);
        await this.serviceRegRepository.update({ id: regId }, { type });

        // Уведомить создателя о закрытии заявки
        if (status === 'closed') {
            const firstLog = await this.serviceLogRepository.findOne({
                where: { reg_id: regId, status: 'registered' },
                order: { timestamp: 'ASC' },
            });
            if (firstLog?.hid) {
                await this.sendPushToHid(
                    firstLog.hid,
                    'Заявка выполнена',
                    `Ваша заявка №${regId} закрыта как выполненная.`,
                );
            }
        }

        return { status: 'success', message: 'Статус сервиса обновлён' };
    }

    async getServiceTypes(headers: Record<string, string>) {
        const tokenCheck = await this.checkToken(headers);
        if (tokenCheck.status !== 'valid') return tokenCheck;
        return this.serviceTypesRepository.find();
    }
}
