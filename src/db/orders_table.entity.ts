import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class OrdersTable {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    order_id: string;

    @Column()
    address: string;

    @Column()
    supplier: string;

    @Column()
    product_id: number;

    @Column()
    count: number;

    @Column()
    date: Date;
}