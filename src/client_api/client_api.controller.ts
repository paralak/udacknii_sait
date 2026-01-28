import {Body, Controller, Get, Post, Headers} from '@nestjs/common';
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
        // Логируем заголовки запроса
        console.log(JSON.stringify(headers, null, 2));
        
        return this.clientAPIService.getHierarchyTree();
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