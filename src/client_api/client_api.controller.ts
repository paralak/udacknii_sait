import {Body, Controller, Get, Post} from '@nestjs/common';
import {ClientAPIService} from './client_api.service';

@Controller('client_api')
export class ClientAPIController {
    constructor(private readonly clientAPIService: ClientAPIService) {
    }

    @Get()
    getHello(): string {
        return this.clientAPIService.getHello();
    }

    @Get('get_hierarchy_tree')
    getHierarchyTree() {
        return this.clientAPIService.getHierarchyTree();
    }
}