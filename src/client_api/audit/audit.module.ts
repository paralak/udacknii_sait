import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditInterceptor } from 'src/common/audit.interceptor';
import { AuditLog } from 'src/db/audit_log.entity';
import { Flags } from 'src/db/flags.entity';

@Module({
    imports: [TypeOrmModule.forFeature([AuditLog, Flags])],
    controllers: [AuditController],
    providers: [
        AuditService,
        { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    ],
    exports: [AuditService],
})
export class AuditModule {}
