import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { Suggestion } from 'src/db/suggestion.entity';
import { SuggestionReply } from 'src/db/suggestion_reply.entity';
import { Token } from 'src/db/token.entity';
import { Flags } from 'src/db/flags.entity';
import { Hierarchy } from 'src/db/hierarchy.entity';
import { PushSubscription } from 'src/db/push_subscription.entity';

@Injectable()
export class SuggestionsService {
  constructor(
    @InjectRepository(Suggestion)
    private readonly suggestionRepository: Repository<Suggestion>,
    @InjectRepository(SuggestionReply)
    private readonly replyRepository: Repository<SuggestionReply>,
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    @InjectRepository(Flags)
    private readonly flagsRepository: Repository<Flags>,
    @InjectRepository(Hierarchy)
    private readonly hierarchyRepository: Repository<Hierarchy>,
    @InjectRepository(PushSubscription)
    private readonly pushSubscriptionRepository: Repository<PushSubscription>,
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
    if (new Date(token.expired) < new Date()) return null;
    return token.user_id;
  }

  private async checkViewAccess(authToken: string | null): Promise<boolean> {
    if (!authToken) return false;
    const hid = await this.resolveHid(authToken);
    if (!hid) return false;
    const flags = await this.flagsRepository.find({ where: { hid } });
    return flags.some(f => f.flag === 'ADMIN' || f.flag === 'TECH_SUPPORT');
  }

  private async sendPushToHid(hid: number, title: string, body: string) {
    const subs = await this.pushSubscriptionRepository.find({ where: { hid } });
    if (!subs.length) return;
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
    webpush.setVapidDetails('mailto:admin@u-org.ru', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const payload = JSON.stringify({ title, body });
    await Promise.allSettled(subs.map(s =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      ).catch(async err => {
        if (err.statusCode === 410) await this.pushSubscriptionRepository.delete({ id: s.id });
      })
    ));
  }

  private async enrichWithRepliesAndName(items: Suggestion[]) {
    if (!items.length) return [];
    const ids = items.map(s => s.id);
    const hids = [...new Set(items.map(s => s.hid).filter(Boolean))] as number[];

    const [replies, people] = await Promise.all([
      this.replyRepository.find({ where: { suggestion_id: ids.length === 1 ? ids[0] : undefined as any } })
        .then(() => this.replyRepository.createQueryBuilder('r').where('r.suggestion_id IN (:...ids)', { ids }).getMany()),
      hids.length
        ? this.hierarchyRepository.createQueryBuilder('h').where('h.id IN (:...hids)', { hids }).getMany()
        : Promise.resolve([]),
    ]);

    const nameMap = new Map(people.map(p => [p.id, p.name]));
    const repliesMap = new Map<number, SuggestionReply[]>();
    replies.forEach(r => {
      if (!repliesMap.has(r.suggestion_id)) repliesMap.set(r.suggestion_id, []);
      repliesMap.get(r.suggestion_id)!.push(r);
    });

    return items.map(s => ({
      ...s,
      userName: s.hid ? (nameMap.get(s.hid) || null) : null,
      replies: repliesMap.get(s.id) || [],
    }));
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

  async getMy(headers: Record<string, string>) {
    const authToken = this.extractToken(headers);
    const hid = await this.resolveHid(authToken);
    if (!hid) return { status: 'error', message: 'Не авторизован' };

    const items = await this.suggestionRepository.find({
      where: { hid },
      order: { created_at: 'DESC' },
    });

    const enriched = await this.enrichWithRepliesAndName(items);
    return { status: 'success', data: enriched };
  }

  async getAll(headers: Record<string, string>) {
    const authToken = this.extractToken(headers);
    const allowed = await this.checkViewAccess(authToken);
    if (!allowed) return { status: 'error', message: 'Нет доступа' };

    const items = await this.suggestionRepository.find({ order: { created_at: 'DESC' } });
    const enriched = await this.enrichWithRepliesAndName(items);
    return { status: 'success', data: enriched };
  }

  async reply(headers: Record<string, string>, suggestionId: number, text: string) {
    const authToken = this.extractToken(headers);
    const allowed = await this.checkViewAccess(authToken);
    if (!allowed) return { status: 'error', message: 'Нет доступа' };

    const adminHid = await this.resolveHid(authToken);
    const suggestion = await this.suggestionRepository.findOne({ where: { id: suggestionId } });
    if (!suggestion) return { status: 'error', message: 'Обращение не найдено' };

    const replyEntity = this.replyRepository.create({
      suggestion_id: suggestionId,
      admin_hid: adminHid!,
      text: text.trim(),
    });
    await this.replyRepository.save(replyEntity);

    // Push-уведомление автору обращения
    if (suggestion.hid) {
      await this.sendPushToHid(
        suggestion.hid,
        'Ответ на ваше обращение',
        `Получен ответ на ваше обращение: ${text.trim()}`,
      );
    }

    return { status: 'success', message: 'Ответ отправлен' };
  }
}
