import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class M_for_zarplati {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  hid: number;

  @Column()
  flag: string;
}