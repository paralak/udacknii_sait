import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// Отпуска сотрудников ЛС. Связь с ls_employees — 1-ко-многим.
// Привязка по ФИО (+ store_hid для устранения неоднозначности), т.к. при пересборке
// ls_employees id переназначаются — employee_id восстанавливается по (fio, store_hid).
@Entity('ls_employee_vacations')
export class LsEmployeeVacation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  employee_id: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fio: string | null;

  @Column({ type: 'int', nullable: true })
  store_hid: number | null;

  // даты как строки (в форме — «дд.мм.гггг», иногда мусор; ручные — ISO)
  @Column({ type: 'varchar', length: 31, nullable: true })
  vacation_start: string | null;

  @Column({ type: 'varchar', length: 31, nullable: true })
  vacation_end: string | null;

  @Column({ type: 'int', nullable: true })
  period: number | null;

  // 'form' — из формы «Заполнить персонал», 'manual' — добавлено вручную
  @Column({ type: 'varchar', length: 15, nullable: true })
  source: string | null;

  @Column({ type: 'varchar', length: 31, nullable: true })
  status: string | null;

  @Column({ type: 'datetime', nullable: true })
  created_at: Date | null;
}
