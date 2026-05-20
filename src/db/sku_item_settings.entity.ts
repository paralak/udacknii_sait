import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class SkuItemSettings {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    address_code: string;

    @Column()
    sku_id: number;

    @Column({ nullable: true })
    supplier_role: string | null;

    @Column({ type: 'float', nullable: true })
    nz: number | null;

    @Column({ type: 'float', nullable: true })
    max_stock: number | null;

    @Column({ type: 'float', default: 1.0 })
    consumption_factor: number;

    @Column({ type: 'float', nullable: true })
    order_multiple: number | null;

    @Column({ type: 'float', nullable: true })
    packaging_multiple: number | null;
}
