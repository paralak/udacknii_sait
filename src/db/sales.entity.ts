import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Sales {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  code: string;

  @Column()
  value: Number;

  @Column()
  date: string;
}