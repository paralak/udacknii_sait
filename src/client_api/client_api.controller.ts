import {Controller, Get, Headers} from '@nestjs/common';
import {ClientAPIService} from './client_api.service';
import {Query} from '@nestjs/common';

@Controller('client_api')
export class ClientAPIController {
    constructor(private readonly clientAPIService: ClientAPIService) {
    }

    @Get()
    getHello(): string {
        return this.clientAPIService.getHello();
    }

    @Get('get_hierarchy_tree')
    getHierarchyTree(@Headers() headers: Record<string, string>) {
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
        
        return this.clientAPIService.getHierarchyTree(authToken);
    }

    @Get('get_address_tree')
    getAddressTree(@Headers() headers: Record<string, string>) {
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

        return this.clientAPIService.getAddressTree(authToken);
    }

    @Get('check_token')
        checkToken(@Query('token') token: string) {
            if (!token) {
            return {
                status: 'error',
                message: 'Токен не предоставлен',
            };
            }
            
            return this.clientAPIService.checkToken(token);
        }
}