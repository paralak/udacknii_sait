import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Personal_ls {
    @PrimaryGeneratedColumn()
    lsid: string;

    @Column()
    fio: string;

    @Column()
    doe: Date;

    @Column()
    pos_id: number|null;
}