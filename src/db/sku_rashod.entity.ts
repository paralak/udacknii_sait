import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class SkuRashod {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    address: string;

    @Column()
    item: number;

    @Column({ type: 'float' })
    value: number;
}
