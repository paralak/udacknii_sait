import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class OrderAccess {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    name_short: string;

    @Column()
    artikul: string;

    @Column()
    packaging: string;

    @Column()
    packaging_supplier: string;

    @Column()
    category_id: number;

    @Column()
    is_ingredient: number;

    @Column()
    supplier_id: number;

    @Column()
    order_multiple: number;

    @Column()
    packaging_multiple: number;
}