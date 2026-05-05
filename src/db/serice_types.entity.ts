import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Service_types {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string;

  @Column()
  name: string;
}