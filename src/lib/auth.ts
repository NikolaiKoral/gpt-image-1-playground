import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { nanoid } from 'nanoid';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'dev-secret-change-in-production'
);

const SALT_ROUNDS = 12;
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
    const token = await new SignJWT({ userId, sessionId: nanoid() })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(JWT_SECRET);

    const cookieStore = await cookies();
    cookieStore.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_DURATION / 1000,
        path: '/'
    });

    return token;
}

export async function verifySession() {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
        return null;
    }

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as { userId: string; sessionId: string };
    } catch {
        return null;
    }
}

export async function destroySession() {
    const cookieStore = await cookies();
    cookieStore.delete('session');
}

// Migrate from SHA-256 to bcrypt
export function needsPasswordMigration(hash: string): boolean {
    // SHA-256 hashes are 64 characters long
    return hash.length === 64 && /^[a-f0-9]{64}$/i.test(hash);
}