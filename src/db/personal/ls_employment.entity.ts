import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// Формы устройства на работу. Связь с ls_employees — 1-ко-многим (у сотрудника может быть
// несколько форм). Привязка по fio+store_hid (id сотрудника переназначаются при пересборке).
@Entity('ls_employment')
export class LsEmployment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  employee_id: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fio: string | null;

  @Column({ type: 'int', nullable: true })
  store_hid: number | null;

  // стандартизированное название типа договора
  @Column({ type: 'varchar', length: 255, nullable: true })
  contract_type: string | null;

  @Column({ type: 'int', nullable: true })
  contract_type_id: number | null;

  // дата «с» (startDate) и «до» (dismissalDate / конец), строками (в форме — «дд.мм.гггг» / ISO)
  @Column({ type: 'varchar', length: 31, nullable: true })
  date_from: string | null;

  @Column({ type: 'varchar', length: 31, nullable: true })
  date_to: string | null;

  // 'form' — из формы (пересобирается), 'manual' — вручную (сохраняется)
  @Column({ type: 'varchar', length: 15, nullable: true })
  source: string | null;

  @Column({ type: 'varchar', length: 31, nullable: true })
  status: string | null;

  @Column({ type: 'datetime', nullable: true })
  created_at: Date | null;
}
