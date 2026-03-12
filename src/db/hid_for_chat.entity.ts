import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class Hid_for_chat {
  @PrimaryColumn()
  id: number;

    @Column()
    hid: number;

    @Column()
    access: number;
}