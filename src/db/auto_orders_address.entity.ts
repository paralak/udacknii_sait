import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class AutoOrdersAddress {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    address_code: string;

    @Column()
    name: string;

    @Column({ type: 'int', nullable: true, unique: true })
    hid: number | null;
}
