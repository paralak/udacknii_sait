import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Service_reg {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string;

  @Column()
  address: number;
}