import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class SupplierSettings {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    address_code: string;

    @Column()
    supplier_role: string;

    @Column()
    supplier_name: string;

    @Column({ nullable: true })
    delivery_days: string | null;

    @Column({ type: 'int', nullable: true })
    lead_time_days: number | null;

    @Column({ type: 'float', nullable: true })
    min_order_sum: number | null;

    @Column({ type: 'tinyint', default: 0 })
    via_rc: number;
}
