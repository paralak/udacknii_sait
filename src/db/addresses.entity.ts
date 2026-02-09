import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Addresses {
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