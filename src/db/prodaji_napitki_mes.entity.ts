import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Prodaji_napitki_mes {
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