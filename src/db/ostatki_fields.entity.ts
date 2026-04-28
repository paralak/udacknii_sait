import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Ostatki_fields {
  @PrimaryGeneratedColumn()
  id: number;

    @Column()
    sku_id: number;

    @Column()
    type: string;

    @Column()
    ostatki_reg_id: number;
}