import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('vacation_applications')
export class VacationApplication {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'sender_hid' })
    senderHid: number;

    @Column({ name: 'employee_lsid', length: 50 })
    employeeLsid: string;

    @CreateDateColumn({ name: 'sent_at' })
    sentAt: Date;

    @Column({ name: 'file_url', length: 500, nullable: true })
    fileUrl: string | null;

    @Column({ type: 'text', nullable: true })
    comment: string | null;

    @Column({ name: 'accountant_comment', type: 'text', nullable: true })
    accountantComment: string | null;

    @Column({ name: 'original_received', type: 'tinyint', default: 0 })
    originalReceived: boolean;

    @Column({ name: 'original_received_at', type: 'datetime', nullable: true })
    originalReceivedAt: Date | null;
}
