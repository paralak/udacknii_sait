import * as jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'jwt-secret-key-change-in-production';

export interface JwtPayload {
    sub: number;
}

export function signJwt(hid: number): string {
    return jwt.sign({ sub: hid } as JwtPayload, SECRET, { expiresIn: '365d' });
}

export function verifyJwt(token: string): JwtPayload | null {
    try {
        return jwt.verify(token, SECRET) as unknown as JwtPayload;
    } catch {
        return null;
    }
}

export function extractTokenFromCookie(headers: Record<string, string>): string | null {
    const cookie = headers['cookie'];
    if (!cookie) return null;
    const match = cookie.match(/auth_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}
