import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sku_ttk')
export class SkuTtk {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 10, nullable: true, default: null })
    address_code: string | null;

    @Column({ type: 'varchar', length: 50 })
    drink_code: string;

    @Column()
    sku_id: number;

    @Column({ type: 'float' })
    coeff: number;
}
