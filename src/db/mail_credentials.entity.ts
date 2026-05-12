import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class MailCredentials {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  hid: number;

  @Column()
  mail: string;

  @Column()
  password: string;
}
