import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class Month_for_zp {
  @PrimaryColumn()
    id: number;

    @Column()
    month:string;
}