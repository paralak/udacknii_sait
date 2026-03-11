import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class Ter_man_list {
  @PrimaryColumn()
  hid: number;
}