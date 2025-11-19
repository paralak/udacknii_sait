import { Entity, Column, PrimaryGeneratedColumn } from '@nestjs/typeorm';

@Entity()
export class Item {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  code: string;
}