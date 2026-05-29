import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('push_subscriptions')
export class PushSubscription {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    hid: number;

    @Column({ type: 'text' })
    endpoint: string;

    @Column({ length: 255 })
    p256dh: string;

    @Column({ length: 255 })
    auth: string;

    @CreateDateColumn()
    created_at: Date;
}
