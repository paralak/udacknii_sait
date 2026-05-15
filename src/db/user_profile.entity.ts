import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('user_profile')
export class UserProfile {
  @PrimaryColumn()
  hid: number;

  @Column({ type: 'date', nullable: true })
  birthday: Date | null;

  @Column({ nullable: true })
  phone: string | null;
}
