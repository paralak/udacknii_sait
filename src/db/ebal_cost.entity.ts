import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Ebal_cost {
  @PrimaryGeneratedColumn()
  id: number;

    @Column()
    date: Date;

    @Column()
    value: number;
}