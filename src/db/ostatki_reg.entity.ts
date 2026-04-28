import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Ostatki_reg {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  parent: number|null;

  @Column()
  access: number;

  @Column()
  address: number;
}