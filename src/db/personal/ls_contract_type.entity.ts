import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// Справочник типов договоров (форм устройства на работу). Аналог ls_vacancies.
@Entity('ls_contract_types')
export class LsContractType {
  @PrimaryGeneratedColumn()
  id: number;

  // код из формы (employment/patent/gph/internship/outsource); может быть пустым для ручных
  @Column({ type: 'varchar', length: 63, nullable: true })
  code: string | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
