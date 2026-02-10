import {Injectable} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Token } from './db/token.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AppService {
    constructor(
        @InjectRepository(Token)
        private tokenRepository: Repository<Token>,
    ) {}

    async checkToken(headers: any) {
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


    getHello(): string {
        return 'Hello Worl1d!';
    }
}
