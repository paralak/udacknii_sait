import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Login {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  login: string;

  @Column()
  hashedpassword: string;

  @Column()
  hid: number;
}