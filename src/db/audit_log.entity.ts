import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

// Журнал вызовов API: кто (hid), что (method + path + module/action),
// когда (created_at), с какими аргументами (query + body).
@Entity('api_audit_log')
export class AuditLog {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: number;

    @Index()
    @Column({ type: 'int', nullable: true })
    hid: number | null;

    @Column({ type: 'varchar', length: 10 })
    method: string;

    @Column({ type: 'varchar', length: 512 })
    path: string;

    // Первый сегмент после client_api (модуль) и последний сегмент (действие).
    @Index()
    @Column({ type: 'varchar', length: 64, nullable: true })
    module: string | null;

    @Column({ type: 'varchar', length: 128, nullable: true })
    action: string | null;

    @Column({ type: 'text', nullable: true })
    query_params: string | null;

    @Column({ type: 'text', nullable: true })
    body: string | null;

    @Column({ type: 'int', nullable: true })
    status_code: number | null;

    @Column({ type: 'varchar', length: 64, nullable: true })
    ip: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    user_agent: string | null;

    @Column({ type: 'int', nullable: true })
    duration_ms: number | null;

    @Index()
    @Column({ type: 'datetime' })
    created_at: Date;
}
