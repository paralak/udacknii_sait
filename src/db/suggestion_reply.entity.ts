import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('suggestion_replies')
export class SuggestionReply {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  suggestion_id: number;

  @Column()
  admin_hid: number;

  @Column({ type: 'text' })
  text: string;

  @CreateDateColumn()
  created_at: Date;
}
