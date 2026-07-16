import { Controller, Get, Query, Headers } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('client_api/audit')
export class AuditController {
    constructor(private readonly auditService: AuditService) {}

    @Get('logs')
    getLogs(@Query() query: Record<string, string>, @Headers() headers: Record<string, string>) {
        return this.auditService.getLogs(headers, query);
    }

    @Get('filters')
    getFilters(@Headers() headers: Record<string, string>) {
        return this.auditService.getFilters(headers);
    }
}
