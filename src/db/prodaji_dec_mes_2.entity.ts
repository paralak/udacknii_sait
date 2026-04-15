import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Prodaji_dec_mes_2 {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  address: string;    

  @Column()
  timestamp: Date;

  @Column()
  name: string;

  @Column()
  count: number;

  @Column()
  sum: number;
}