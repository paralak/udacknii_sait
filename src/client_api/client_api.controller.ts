import {Controller, Get, Post, Patch, Headers, Body} from '@nestjs/common';
import {ClientAPIService} from './client_api.service';
import {Query} from '@nestjs/common';

@Controller('client_api')
export class ClientAPIController {
    constructor(private readonly clientAPIService: ClientAPIService) {
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

    @Get('get_hierarchy_item')
    getHierarchyItem(@Query('hid') hid: string) {
        if (!hid) {
            return { status: 'error', message: 'hid не предоставлен' };
        }
        return this.clientAPIService.getHierarchyItem(Number(hid));
    }

    @Get('profile')
    getProfile(@Headers() headers: Record<string, string>) {
        const authToken = this.extractToken(headers);
        if (!authToken) return { status: 'error', message: 'Токен не предоставлен' };
        return this.clientAPIService.getProfile(authToken);
    }

    @Patch('profile')
    updateProfile(
        @Headers() headers: Record<string, string>,
        @Body() body: { birthday?: string | null; phone?: string | null },
    ) {
        const authToken = this.extractToken(headers);
        if (!authToken) return { status: 'error', message: 'Токен не предоставлен' };
        return this.clientAPIService.updateProfile(authToken, body);
    }

    @Post('change_password')
    changePassword(
        @Headers() headers: Record<string, string>,
        @Body() body: { oldHashedPassword: string; newHashedPassword: string },
    ) {
        const authToken = this.extractToken(headers);
        if (!authToken) return { status: 'error', message: 'Токен не предоставлен' };
        return this.clientAPIService.changePassword(authToken, body.oldHashedPassword, body.newHashedPassword);
    }

    @Post('login')
    login(@Body() body: { login: string; hashedpassword: string }) {
        const { login, hashedpassword } = body;
        if (!login || !hashedpassword) {
            return {
                status: 'error',
                message: 'Имя пользователя или пароль не предоставлены',
            };
        }
        return this.clientAPIService.login(login, hashedpassword);
    }

    private extractToken(headers: Record<string, string>): string | null {
        const cookieHeader = headers['cookie'];
        if (cookieHeader) {
            const match = cookieHeader.match(/auth_token=([^;]+)/);
            if (match) return match[1];
        }
        return null;
    }
}