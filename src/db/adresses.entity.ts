import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Adresses {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    parent_id: number;

    @Column()
    type: string;

    @Column()
    description: string;
}