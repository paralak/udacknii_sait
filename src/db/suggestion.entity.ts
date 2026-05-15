import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('suggestions')
export class Suggestion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  hid: number;

  @Column()
  category: string; // 'correction' | 'message'

  @Column({ type: 'text' })
  text: string;

  @Column({ nullable: true, length: 500 })
  contact: string;

  @CreateDateColumn()
  created_at: Date;
}
