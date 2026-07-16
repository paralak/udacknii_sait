import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditLog } from 'src/db/audit_log.entity';
import { Flags } from 'src/db/flags.entity';
import { extractTokenFromCookie, verifyJwt } from 'src/auth/jwt.util';

// Ключи, значения которых нельзя писать в журнал в открытом виде.
const REDACT_KEYS = ['password', 'hashedpassword', 'hashedPassword', 'pass', 'token', 'newHashedPassword', 'oldHashedPassword'];
const MAX_JSON_LEN = 6000;

export interface RecordInput {
    hid: number | null;
    method: string;
    path: string;
    module: string | null;
    action: string | null;
    query: any;
    body: any;
    statusCode: number | null;
    ip: string | null;
    userAgent: string | null;
    durationMs: number | null;
}

@Injectable()
export class AuditService implements OnApplicationBootstrap {
    constructor(
        private dataSource: DataSource,
        @InjectRepository(Flags) private flagsRepository: Repository<Flags>,
    ) {}

    async onApplicationBootstrap() {
        await this.dataSource.query(`
            CREATE TABLE IF NOT EXISTS api_audit_log (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                hid INT NULL,
                method VARCHAR(10) NOT NULL,
                path VARCHAR(512) NOT NULL,
                module VARCHAR(64) NULL,
                action VARCHAR(128) NULL,
                query_params TEXT NULL,
                body TEXT NULL,
                status_code INT NULL,
                ip VARCHAR(64) NULL,
                user_agent VARCHAR(255) NULL,
                duration_ms INT NULL,
                created_at DATETIME NOT NULL,
                KEY idx_hid (hid),
                KEY idx_created (created_at),
                KEY idx_module (module),
                KEY idx_path (path(191))
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
    }

    // Разбор hid из куки auth_token либо из заголовка Authorization: Bearer.
    resolveHid(headers: Record<string, string>): number | null {
        let token = extractTokenFromCookie(headers);
        if (!token) {
            const auth = headers['authorization'];
            if (auth && auth.toLowerCase().startsWith('bearer ')) token = auth.slice(7).trim();
        }
        if (!token) return null;
        const payload = verifyJwt(token);
        return payload ? payload.sub : null;
    }

    private sanitize(obj: any): string | null {
        if (obj == null) return null;
        try {
            const clone = JSON.parse(JSON.stringify(obj, (key, value) => {
                if (REDACT_KEYS.includes(key)) return '***';
                // Не пишем base64/буферы файлов целиком.
                if (typeof value === 'string' && value.length > 2000) return value.slice(0, 2000) + '…';
                return value;
            }));
            if (clone == null) return null;
            if (typeof clone === 'object' && Object.keys(clone).length === 0) return null;
            let s = JSON.stringify(clone);
            if (s.length > MAX_JSON_LEN) s = s.slice(0, MAX_JSON_LEN) + '…';
            return s;
        } catch {
            return null;
        }
    }

    // Запись строки журнала. Никогда не бросает исключение (fire-and-forget).
    async record(input: RecordInput): Promise<void> {
        try {
            await this.dataSource.query(
                `INSERT INTO api_audit_log
                 (hid, method, path, module, action, query_params, body, status_code, ip, user_agent, duration_ms, created_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    input.hid,
                    input.method,
                    input.path.slice(0, 512),
                    input.module,
                    input.action ? input.action.slice(0, 128) : null,
                    this.sanitize(input.query),
                    this.sanitize(input.body),
                    input.statusCode,
                    input.ip ? input.ip.slice(0, 64) : null,
                    input.userAgent ? input.userAgent.slice(0, 255) : null,
                    input.durationMs,
                    new Date(),
                ],
            );
        } catch {
            // Журналирование не должно ломать основной запрос.
        }
    }

    private async requireAdmin(headers: Record<string, string>): Promise<any | null> {
        const hid = this.resolveHid(headers);
        if (!hid) return { status: 'error', message: 'Недействительный или истёкший токен' };
        const flags = await this.flagsRepository.find({ where: { hid } });
        if (!flags.some(f => f.flag === 'ADMIN')) return { status: 'error', message: 'Нет доступа' };
        return null;
    }

    // GET /client_api/audit/logs — просмотр журнала с фильтрами/сортировкой/поиском (ADMIN).
    async getLogs(headers: Record<string, string>, q: any) {
        const err = await this.requireAdmin(headers);
        if (err) return err;

        const where: string[] = [];
        const params: any[] = [];

        if (q.hid) { where.push('hid = ?'); params.push(Number(q.hid)); }
        if (q.method) { where.push('method = ?'); params.push(String(q.method).toUpperCase()); }
        if (q.module) { where.push('module = ?'); params.push(String(q.module)); }
        if (q.status) { where.push('status_code = ?'); params.push(Number(q.status)); }
        if (q.from) { where.push('created_at >= ?'); params.push(String(q.from)); }
        if (q.to) { where.push('created_at <= ?'); params.push(String(q.to)); }
        if (q.search) {
            const s = `%${String(q.search)}%`;
            where.push('(path LIKE ? OR action LIKE ? OR module LIKE ? OR query_params LIKE ? OR body LIKE ? OR CAST(hid AS CHAR) LIKE ?)');
            params.push(s, s, s, s, s, s);
        }
        const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

        const sortCols: Record<string, string> = {
            id: 'id', created_at: 'created_at', hid: 'hid', method: 'method',
            module: 'module', action: 'action', path: 'path', status_code: 'status_code', duration_ms: 'duration_ms',
        };
        const sortBy = sortCols[q.sortBy] || 'created_at';
        const sortDir = String(q.sortDir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        const page = Math.max(1, Number(q.page) || 1);
        const pageSize = Math.min(500, Math.max(1, Number(q.pageSize) || 100));
        const offset = (page - 1) * pageSize;

        const totalRow = await this.dataSource.query(
            `SELECT COUNT(*) AS c FROM api_audit_log ${whereSql}`, params,
        );
        const total = Number(totalRow[0]?.c || 0);

        const rows = await this.dataSource.query(
            `SELECT id, hid, method, path, module, action, query_params, body, status_code, ip, user_agent, duration_ms, created_at
             FROM api_audit_log ${whereSql}
             ORDER BY ${sortBy} ${sortDir}
             LIMIT ? OFFSET ?`,
            [...params, pageSize, offset],
        );

        return { status: 'success', total, page, pageSize, logs: rows };
    }

    // GET /client_api/audit/filters — значения для выпадающих фильтров (ADMIN).
    async getFilters(headers: Record<string, string>) {
        const err = await this.requireAdmin(headers);
        if (err) return err;
        const modules = await this.dataSource.query(
            `SELECT module, COUNT(*) AS c FROM api_audit_log WHERE module IS NOT NULL GROUP BY module ORDER BY c DESC`,
        );
        const methods = await this.dataSource.query(
            `SELECT method, COUNT(*) AS c FROM api_audit_log GROUP BY method ORDER BY c DESC`,
        );
        const statuses = await this.dataSource.query(
            `SELECT status_code, COUNT(*) AS c FROM api_audit_log WHERE status_code IS NOT NULL GROUP BY status_code ORDER BY status_code`,
        );
        return { status: 'success', modules, methods, statuses };
    }
}
