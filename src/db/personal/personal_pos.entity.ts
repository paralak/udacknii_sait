import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Personal_pos {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    hid: number;

    @Column()
    name: string;

    @Column()
    lsid: string|null;
}