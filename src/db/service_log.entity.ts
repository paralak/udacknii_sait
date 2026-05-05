import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Service_log {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  reg_id: number;

  @Column()
  type: string;

  @Column()
  message: string;

  @Column()
  status: string;

  @Column()
  timestamp: Date;

  @Column()
  hid: number;
}