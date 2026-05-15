import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Suggestion } from 'src/db/suggestion.entity';
import { Token } from 'src/db/token.entity';
import { Flags } from 'src/db/flags.entity';

@Injectable()
export class SuggestionsService {
  constructor(
    @InjectRepository(Suggestion)
    private readonly suggestionRepository: Repository<Suggestion>,
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    @InjectRepository(Flags)
    private readonly flagsRepository: Repository<Flags>,
  ) {}

  private extractToken(headers: Record<string, string>): string | null {
    const cookie = headers['cookie'];
    if (!cookie) return null;
    const match = cookie.match(/auth_token=([^;]+)/);
    return match ? match[1] : null;
  }

  private async resolveHid(authToken: string | null): Promise<number | null> {
    if (!authToken) return null;
    const token = await this.tokenRepository.findOne({ where: { token: authToken } });
    if (!token) return null;
    const now = new Date();
    if (new Date(token.expired) < now) return null;
    return token.user_id;
  }

  private async checkViewAccess(authToken: string | null): Promise<boolean> {
    if (!authToken) return false;
    const hid = await this.resolveHid(authToken);
    if (!hid) return false;
    const flags = await this.flagsRepository.find({ where: { hid } });
    const flagList = flags.map(f => f.flag);
    return flagList.includes('ADMIN') || flagList.includes('TECH_SUPPORT');
  }

  async submit(
    headers: Record<string, string>,
    category: string,
    text: string,
    contact: string | null,
  ) {
    if (!category || !text?.trim()) {
      return { status: 'error', message: 'Категория и текст обязательны' };
    }

    if (!['correction', 'message'].includes(category)) {
      return { status: 'error', message: 'Неверная категория' };
    }

    const authToken = this.extractToken(headers);
    const hid = await this.resolveHid(authToken);

    const suggestion = this.suggestionRepository.create({
      hid: hid ?? undefined,
      category,
      text: text.trim(),
      contact: contact?.trim() || undefined,
    });

    await this.suggestionRepository.save(suggestion);

    return { status: 'success', message: 'Предложение отправлено' };
  }

  async getAll(headers: Record<string, string>) {
    const authToken = this.extractToken(headers);
    const allowed = await this.checkViewAccess(authToken);

    if (!allowed) {
      return { status: 'error', message: 'Нет доступа' };
    }

    const items = await this.suggestionRepository.find({
      order: { created_at: 'DESC' },
    });

    return { status: 'success', data: items };
  }
}
