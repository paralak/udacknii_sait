import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { extractTokenFromCookie, verifyJwt } from 'src/auth/jwt.util';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

interface UploadedMulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? '/mnt/shared/uploads';

@Injectable()
export class FilesService {
  constructor() {}

  private async resolveHid(authToken: string): Promise<number | null> {
    const payload = verifyJwt(authToken);
    return payload ? payload.sub : null;
  }

  async uploadAvatar(
    headers: Record<string, string>,
    file: UploadedMulterFile,
  ) {
    const authToken = extractTokenFromCookie(headers);
    if (!authToken) return { status: 'error', message: 'Токен не предоставлен' };

    const hid = await this.resolveHid(authToken);
    if (!hid) return { status: 'error', message: 'Недействительный токен' };

    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'];
    if (!allowed.includes(ext)) {
      return { status: 'error', message: 'Недопустимый формат файла' };
    }

    const filename = `avatar_${hid}.jpg`;
    const destPath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(destPath, file.buffer);

    return { status: 'success', filename };
  }

  async uploadFile(
    headers: Record<string, string>,
    file: UploadedMulterFile,
  ) {
    const authToken = extractTokenFromCookie(headers);
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
