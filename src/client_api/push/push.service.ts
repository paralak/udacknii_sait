import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from 'src/db/push_subscription.entity';
import { Hierarchy } from 'src/db/hierarchy.entity';

webpush.setVapidDetails(
    'mailto:admin@u-org.ru',
    process.env.VAPID_PUBLIC_KEY || 'BPtJVFSgA6KHQjd-DGw61Xi1PKcl99Sf_4NE8v8LH1Yb1pdR72A9vI2jVvKiXlTMB2zFwcX_ZSlNpuiK9gXFtYc',
    process.env.VAPID_PRIVATE_KEY || 'mPwSuRyZKPaowW2qL3km4T3Y5CPRSvc_YkcAoWDJqW0',
);

@Injectable()
export class PushService {
    constructor(
        @InjectRepository(PushSubscription)
        private subscriptionRepo: Repository<PushSubscription>,

        @InjectRepository(Hierarchy)
        private hierarchyRepo: Repository<Hierarchy>,
    ) {}

    async subscribe(hid: number, endpoint: string, p256dh: string, auth: string) {
        const existing = await this.subscriptionRepo.findOne({ where: { endpoint } });
        if (existing) {
            existing.hid = hid;
            existing.p256dh = p256dh;
            existing.auth = auth;
            await this.subscriptionRepo.save(existing);
            return { status: 'updated' };
        }
        const sub = this.subscriptionRepo.create({ hid, endpoint, p256dh, auth });
        await this.subscriptionRepo.save(sub);
        return { status: 'created' };
    }

    async unsubscribe(hid: number, endpoint: string) {
        await this.subscriptionRepo.delete({ hid, endpoint });
        return { status: 'success' };
    }

    async getSubscribers() {
        const subs = await this.subscriptionRepo
            .createQueryBuilder('s')
            .select(['s.id', 's.hid', 's.created_at'])
            .getMany();

        const hids = [...new Set(subs.map(s => s.hid))];
        const people = hids.length
            ? await this.hierarchyRepo
                .createQueryBuilder('h')
                .where('h.id IN (:...hids)', { hids })
                .getMany()
            : [];

        const nameMap = Object.fromEntries(people.map(p => [p.id, p.name]));

        const seen = new Set<number>();
        return subs
            .filter(s => { if (seen.has(s.hid)) return false; seen.add(s.hid); return true; })
            .map(s => ({ hid: s.hid, name: nameMap[s.hid] ?? `hid ${s.hid}`, since: s.created_at }));
    }

    async sendToHid(hid: number, title: string, body: string) {
        const subs = await this.subscriptionRepo.find({ where: { hid } });
        if (!subs.length) return { status: 'no_subscribers' };

        const payload = JSON.stringify({ title, body });
        const results = await Promise.allSettled(
            subs.map(s =>
                webpush.sendNotification(
                    { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                    payload,
                ).catch(async err => {
                    if (err.statusCode === 410) {
                        await this.subscriptionRepo.delete({ id: s.id });
                    }
                    throw err;
                }),
            ),
        );

        const sent = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.length - sent;
        return { status: 'ok', sent, failed };
    }

    async sendToAll(title: string, body: string) {
        const subs = await this.subscriptionRepo.find();
        if (!subs.length) return { status: 'no_subscribers' };

        const payload = JSON.stringify({ title, body });
        const results = await Promise.allSettled(
            subs.map(s =>
                webpush.sendNotification(
                    { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                    payload,
                ).catch(async err => {
                    if (err.statusCode === 410) await this.subscriptionRepo.delete({ id: s.id });
                    throw err;
                }),
            ),
        );

        const sent = results.filter(r => r.status === 'fulfilled').length;
        return { status: 'ok', sent, failed: results.length - sent };
    }

    getVapidPublicKey() {
        return process.env.VAPID_PUBLIC_KEY || 'BPtJVFSgA6KHQjd-DGw61Xi1PKcl99Sf_4NE8v8LH1Yb1pdR72A9vI2jVvKiXlTMB2zFwcX_ZSlNpuiK9gXFtYc';
    }
}
