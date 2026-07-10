import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// Нормализованный список сотрудников, собранный из формы «Заполнить персонал»
// (последние снимки manager_ls_report). Все поля в одной таблице, id autoincrement с 0.
@Entity('ls_employees')
export class LsEmployee {
  @PrimaryGeneratedColumn()
  id: number;

  // номер (телефон сотрудника из формы)
  @Column({ type: 'varchar', length: 63, nullable: true })
  number: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fio: string | null;

  // нормализованная должность (финальный список); null для нераспознанных
  @Column({ type: 'varchar', length: 255, nullable: true })
  position: string | null;

  // ссылка на ls_vacancies.id (null если должность не нормализована)
  @Column({ type: 'int', nullable: true })
  vacancy_id: number | null;

  // адрес (store) — hid магазина из отчёта
  @Column({ type: 'int', nullable: true })
  store_hid: number | null;

  // имя магазина (best-effort; сейчас в БД отсутствует, заполняется на чтении)
  @Column({ type: 'varchar', length: 255, nullable: true })
  store_name: string | null;

  // дата добавления (время снимка формы)
  @Column({ type: 'datetime', nullable: true })
  added_at: Date | null;

  // статус: active / dismissed
  @Column({ type: 'varchar', length: 63, nullable: true })
  status: string | null;

  // флаги сотрудника (через запятую); пока пусто
  @Column({ type: 'varchar', length: 255, nullable: true })
  flags: string | null;

  // исходный lsid для трассировки
  @Column({ type: 'varchar', length: 31, nullable: true })
  lsid: string | null;

  // исходное (ненормализованное) имя должности
  @Column({ type: 'varchar', length: 255, nullable: true })
  raw_position: string | null;

  // 'form' — из формы (пересобирается), 'manual' — добавлен вручную (сохраняется при пересборке)
  @Column({ type: 'varchar', length: 15, nullable: true })
  source: string | null;
}
