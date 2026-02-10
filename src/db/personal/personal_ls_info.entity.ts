import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Personal_ls_info {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    type: string;

    @Column()
    label: string;

    @Column()
    value: string;

    @Column()
    lsid: string;
}