import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class OrderAccess {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    flag: string;

    @Column()
    order_id: string;

    @Column()
    start_day: Date;

    @Column()
    end_day: Date;
}