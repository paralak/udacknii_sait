import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class Chat_list {
    @PrimaryColumn()
    id: number;

    @Column()
    hid_from: number;

    @Column()
    hid_to: number;

    @Column()
    created_at: Date;
}