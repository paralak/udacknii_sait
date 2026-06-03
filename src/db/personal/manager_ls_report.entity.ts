import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('manager_ls_report')
export class ManagerLsReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  store_hid: number;

  @Column()
  manager_hid: number;

  @Column({ type: 'datetime' })
  filled_at: Date;

  @Column({ type: 'json' })
  data: object;
}
