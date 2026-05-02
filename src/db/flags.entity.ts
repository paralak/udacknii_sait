import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Flags {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  hid: number;

  @Column()
  flag: string;
}