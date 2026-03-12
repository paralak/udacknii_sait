import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class Chat_bukket {
  @PrimaryColumn()
    id: number;

    @Column()
    chat_id: number;

    @Column()
    hid: number;

    @Column()
    timestamp: Date;

    @Column()
    message: string;

    @Column()
    is_readed: number;
}