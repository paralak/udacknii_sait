import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { AuditService } from 'src/client_api/audit/audit.service';

// Глобальный перехватчик: логирует каждый HTTP-запрос в api_audit_log.
// Запись выполняется по событию res 'finish' — тогда известны финальный
// статус-код и полная длительность, независимо от успеха/ошибки.
@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(private readonly auditService: AuditService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        if (context.getType() !== 'http') return next.handle();

        const req = context.switchToHttp().getRequest<Request>();
        const res = context.switchToHttp().getResponse<Response>();
        const start = Date.now();

        // Разбираем путь: /client_api/<module>/<...>/<action>
        const rawPath = (req.originalUrl || req.url || '').split('?')[0];
        const parts = rawPath.split('/').filter(Boolean);
        const ci = parts.indexOf('client_api');
        const module = ci >= 0 ? (parts[ci + 1] || null) : (parts[0] || null);
        const action = parts.length ? parts[parts.length - 1] : null;

        // Собственные endpoints журнала не логируем, чтобы не зашумлять при просмотре.
        if (module === 'audit') return next.handle();

        const headers = (req.headers || {}) as Record<string, string>;
        const hid = this.auditService.resolveHid(headers);
        const rawIp = (headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '') as string;
        const ip = rawIp.split(',')[0].trim();
        const userAgent = headers['user-agent'] || null;
        const isMultipart = (headers['content-type'] || '').includes('multipart/form-data');

        let logged = false;
        const write = () => {
            if (logged) return;
            logged = true;
            void this.auditService.record({
                hid,
                method: req.method,
                path: rawPath,
                module,
                action,
                query: req.query && Object.keys(req.query).length ? req.query : null,
                body: isMultipart ? { _multipart: true } : (req.body && Object.keys(req.body || {}).length ? req.body : null),
                statusCode: res.statusCode,
                ip,
                userAgent,
                durationMs: Date.now() - start,
            });
        };

        res.on('finish', write);
        res.on('close', write);

        return next.handle();
    }
}
