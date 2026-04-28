import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Stock2 {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  address: number

  @Column()
  sku_id: string;

  @Column()
  value: number;

  @Column()
  date: string;
}