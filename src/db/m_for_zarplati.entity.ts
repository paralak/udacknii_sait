import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class M_for_zarplati {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  addr: number;

  @Column()
  c: number;

    @Column()
  t: number;

  @Column()
  s : number;

  @Column()
  date: Date;
}