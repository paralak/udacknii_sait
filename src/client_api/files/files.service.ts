import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from 'src/db/token.entity';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? '/mnt/shared/uploads';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
  ) {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  private extractToken(headers: Record<string, string>): string | null {
    const cookie = headers['cookie'];
    if (!cookie) return null;
    const match = cookie.match(/auth_token=([^;]+)/);
    return match ? match[1] : null;
  }

  private async resolveHid(authToken: string): Promise<number | null> {
    const token = await this.tokenRepository.findOne({ where: { token: authToken } });
    if (!token) return null;
    if (new Date(token.expired) < new Date()) return null;
    return token.user_id;
  }

  async uploadFile(
    headers: Record<string, string>,
    file: Express.Multer.File,
  ) {
    const authToken = this.extractToken(headers);
    if (!authToken) {
      return { status: 'error', message: 'Токен не предоставлен' };
    }

    const hid = await this.resolveHid(authToken);
    if (!hid) {
      return { status: 'error', message: 'Недействительный токен' };
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'];
    if (!allowed.includes(ext)) {
      return { status: 'error', message: 'Недопустимый формат файла' };
    }

    const fileId = `${randomUUID()}${ext}`;
    const destPath = path.join(UPLOADS_DIR, fileId);

    fs.writeFileSync(destPath, file.buffer);

    return {
      status: 'success',
      fileId,
      originalName: file.originalname,
    };
  }
}
