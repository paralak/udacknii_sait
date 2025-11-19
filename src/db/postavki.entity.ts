import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Postavki {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  code: string;

  @Column()
  value: Number;

  @Column()
  date: string;
}