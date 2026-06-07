import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('zakup_rashodniki_mes')
export class ZakupRashodniki {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  address: string;

  @Column()
  timestamp: Date;

  @Column()
  artikul: string;

  @Column({ type: 'float' })
  count: number;

  @Column({ type: 'float' })
  price: number;
}
