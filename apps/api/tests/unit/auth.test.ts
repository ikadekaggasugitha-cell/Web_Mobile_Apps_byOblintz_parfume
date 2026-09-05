import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

// ---- Mocks (hoisted so they exist before the route module is imported) ----
const mocks = vi.hoisted(() => ({
  mockLimit: vi.fn(),
  mockReturning: vi.fn(),
  mockValues: vi.fn(),
  mockSet: vi.fn(),
  mockWhere: vi.fn(),
  mockFrom: vi.fn(),
  mockSelectFn: vi.fn(),
  mockInsertFn: vi.fn(),
  mockUpdateFn: vi.fn(),
}));

const {
  mockLimit,
  mockReturning,
  mockValues,
  mockSet,
  mockWhere,
  mockFrom,
  mockSelectFn,
  mockInsertFn,
  mockUpdateFn,
} = mocks;

const db = vi.hoisted(() => ({
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: mocks.mockLimit,
      }),
    }),
  }),
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: mocks.mockReturning,
    }),
  }),
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: mocks.mockReturning,
      }),
    }),
  }),
  execute: vi.fn(),
}));

const redis = vi.hoisted(() => ({
  incr: vi.fn(),
  expire: vi.fn(),
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
}));

const bcrypt = vi.hoisted(() => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

vi.mock('@/db', () => ({ db }));
vi.mock('@/config/redis', () => ({ redis }));
vi.mock('bcrypt', () => ({ default: bcrypt, ...bcrypt }));
vi.mock('nanoid', () => ({ nanoid: () => 'reset-token-fixed' }));
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  welcomeEmail: vi.fn(() => ({ subject: 'Welcome', html: '<p>hi</p>' })),
  resetPasswordEmail: vi.fn(() => ({ subject: 'Reset', html: '<p>reset</p>' })),
  otpEmail: vi.fn(() => ({ subject: 'OTP', html: '<p>otp</p>' })),
}));

import { authRoutes } from '@/modules/auth/auth.routes';
import { sendEmail } from '@/lib/email';

const USER = {
  id: 'user-1',
  email: 'budi@example.com',
  name: 'Budi',
  role: 'CUSTOMER',
  passwordHash: 'stored-hash',
};

describe('auth module (TC-001 – TC-005)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: 'test-jwt-secret-min-32-characters!!' });
    await app.register(authRoutes, { prefix: '/api/auth' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    redis.incr.mockResolvedValue(1);
    redis.expire.mockResolvedValue(1);
    redis.set.mockResolvedValue('OK');
    redis.get.mockResolvedValue(null);
    redis.del.mockResolvedValue(1);
    bcrypt.hash.mockResolvedValue('new-hash');
    bcrypt.compare.mockResolvedValue(true);

    mockLimit.mockReset();
    mockReturning.mockReset();
    mockValues.mockReset();
    mockSet.mockReset();
    mockWhere.mockReset();
    mockFrom.mockReset();

    mockLimit.mockResolvedValue([]);
    mockReturning.mockResolvedValue([]);
  });

  // ==================== TC-001: REGISTER ====================
  describe('TC-001: POST /register (valid email)', () => {
    it('creates the user and returns tokens', async () => {
      mockReturning.mockResolvedValue([{ ...USER }]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: USER.email, password: 'password123', name: 'Budi' },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json().data;
      expect(data.user).toEqual({
        id: USER.id,
        email: USER.email,
        name: USER.name,
        role: USER.role,
      });
      expect(data.accessToken).toBeTruthy();
      expect(data.refreshToken).toBeTruthy();
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(db.insert).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: USER.email })
      );
      expect(redis.set).toHaveBeenCalledWith(
        `refresh:${USER.id}`,
        expect.any(String),
        'EX',
        7 * 24 * 60 * 60
      );
    });

    it('returns 429 when register rate limit is exceeded', async () => {
      redis.incr.mockResolvedValue(6);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: USER.email, password: 'password123', name: 'Budi' },
      });

      expect(res.statusCode).toBe(429);
      expect(res.json().error.code).toBe('RATE_LIMIT');
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('returns 400 on schema validation failure (short password)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: USER.email, password: 'short', name: 'Budi' },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // ==================== TC-002: REGISTER EXISTING EMAIL ====================
  describe('TC-002: POST /register (existing email)', () => {
    it('returns 409 CONFLICT', async () => {
      mockLimit.mockResolvedValue([{ ...USER }]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: USER.email, password: 'password123', name: 'Budi' },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe('CONFLICT');
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  // ==================== TC-003: LOGIN ====================
  describe('TC-003: POST /login (correct credentials)', () => {
    it('returns 200 with user and tokens', async () => {
      mockLimit.mockResolvedValue([{ ...USER }]);
      bcrypt.compare.mockResolvedValue(true);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: USER.email, password: 'password123' },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.user.id).toBe(USER.id);
      expect(data.accessToken).toBeTruthy();
      expect(data.refreshToken).toBeTruthy();
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'stored-hash');
    });

    it('returns 401 when the email is not found', async () => {
      mockLimit.mockResolvedValue([]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'ghost@example.com', password: 'password123' },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe('UNAUTHORIZED');
    });
  });

  // ==================== TC-004: LOGIN WRONG PASSWORD ====================
  describe('TC-004: POST /login (wrong password)', () => {
    it('returns 401 UNAUTHORIZED', async () => {
      mockLimit.mockResolvedValue([{ ...USER }]);
      bcrypt.compare.mockResolvedValue(false);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: USER.email, password: 'wrong-password' },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe('UNAUTHORIZED');
      expect(redis.set).not.toHaveBeenCalled();
    });
  });

  // ==================== TC-005: RESET PASSWORD FLOW ====================
  describe('TC-005: forgot-password / reset-password', () => {
    it('sends a reset email when the account exists', async () => {
      mockLimit.mockResolvedValue([{ ...USER }]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/forgot-password',
        payload: { email: USER.email },
      });

      expect(res.statusCode).toBe(200);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: USER.email })
      );
      expect(redis.set).toHaveBeenCalledWith(
        `reset:${USER.id}`,
        expect.any(String),
        'EX',
        60 * 60
      );
    });

    it('does not leak account existence for unknown emails', async () => {
      mockLimit.mockResolvedValue([]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/forgot-password',
        payload: { email: 'ghost@example.com' },
      });

      expect(res.statusCode).toBe(200);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('resets the password with a valid token', async () => {
      redis.get.mockResolvedValue('stored-reset-hash');
      bcrypt.compare.mockResolvedValue(true);
      mockReturning.mockResolvedValue([{ ...USER }]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        payload: { token: 'reset-token-fixed', userId: USER.id, password: 'newpassword123' },
      });

      expect(res.statusCode).toBe(200);
      expect(db.update).toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalledWith(`reset:${USER.id}`);
    });

    it('rejects reset when no token is stored (expired)', async () => {
      redis.get.mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        payload: { token: 'reset-token-fixed', userId: USER.id, password: 'newpassword123' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('INVALID_TOKEN');
      expect(db.update).not.toHaveBeenCalled();
    });

    it('rejects reset when the token does not match', async () => {
      redis.get.mockResolvedValue('stored-reset-hash');
      bcrypt.compare.mockResolvedValue(false);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        payload: { token: 'bad-token', userId: USER.id, password: 'newpassword123' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('INVALID_TOKEN');
    });
  });

  // ==================== REFRESH / ME / LOGOUT ====================
  describe('POST /refresh', () => {
    it('issues new tokens for a valid refresh token', async () => {
      const refreshToken = app.jwt.sign({ id: USER.id });
      redis.get.mockResolvedValue(refreshToken);
      mockLimit.mockResolvedValue([{ ...USER }]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: { refreshToken },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.accessToken).toBeTruthy();
      expect(res.json().data.refreshToken).toBeTruthy();
    });

    it('returns 400 when refresh token is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 401 when the stored token does not match', async () => {
      const refreshToken = app.jwt.sign({ id: USER.id });
      redis.get.mockResolvedValue('a-different-token');

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: { refreshToken },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /me', () => {
    it('returns the current user', async () => {
      mockLimit.mockResolvedValue([{
        id: USER.id,
        email: USER.email,
        name: USER.name,
        role: USER.role,
      }]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { authorization: `Bearer ${app.jwt.sign({ id: USER.id })}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.id).toBe(USER.id);
    });

    it('returns 401 without a token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/auth/me' });

      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /logout', () => {
    it('clears the refresh token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: { authorization: `Bearer ${app.jwt.sign({ id: USER.id })}` },
      });

      expect(res.statusCode).toBe(200);
      expect(redis.del).toHaveBeenCalledWith(`refresh:${USER.id}`);
    });
  });

  // ==================== OTP SEND / VERIFY ====================
  describe('POST /otp/send', () => {
    it('sends an OTP email when the account exists', async () => {
      mockLimit.mockResolvedValue([{ ...USER }]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/otp/send',
        payload: { email: USER.email },
      });

      expect(res.statusCode).toBe(200);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: USER.email })
      );
      expect(redis.set).toHaveBeenCalledWith(
        `otp:${USER.email}`,
        expect.any(String),
        'EX',
        5 * 60
      );
    });

    it('does not leak existence for unknown emails', async () => {
      mockLimit.mockResolvedValue([]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/otp/send',
        payload: { email: 'ghost@example.com' },
      });

      expect(res.statusCode).toBe(200);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('returns 429 when OTP rate limit is exceeded', async () => {
      redis.incr.mockResolvedValue(4);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/otp/send',
        payload: { email: USER.email },
      });

      expect(res.statusCode).toBe(429);
      expect(res.json().error.code).toBe('RATE_LIMIT');
    });
  });

  describe('POST /otp/verify', () => {
    it('verifies the email with a correct OTP', async () => {
      redis.get.mockResolvedValue('stored-otp-hash');
      bcrypt.compare.mockResolvedValue(true);
      mockReturning.mockResolvedValue([{ ...USER, emailVerified: true }]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/otp/verify',
        payload: { email: USER.email, otp: '123456' },
      });

      expect(res.statusCode).toBe(200);
      expect(db.update).toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalledWith(`otp:${USER.email}`);
    });

    it('returns 400 when no OTP is stored (expired)', async () => {
      redis.get.mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/otp/verify',
        payload: { email: USER.email, otp: '123456' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('INVALID_OTP');
    });

    it('returns 400 for an incorrect OTP', async () => {
      redis.get.mockResolvedValue('stored-otp-hash');
      bcrypt.compare.mockResolvedValue(false);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/otp/verify',
        payload: { email: USER.email, otp: '000000' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('INVALID_OTP');
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  // ==================== RATE LIMITS & ERROR BRANCHES ====================
  describe('rate limits and error handling', () => {
    it('returns 429 when login rate limit is exceeded', async () => {
      redis.incr.mockResolvedValue(11);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: USER.email, password: 'password123' },
      });

      expect(res.statusCode).toBe(429);
      expect(res.json().error.code).toBe('RATE_LIMIT');
    });

    it('returns 429 when forgot-password rate limit is exceeded', async () => {
      redis.incr.mockResolvedValue(6);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/forgot-password',
        payload: { email: USER.email },
      });

      expect(res.statusCode).toBe(429);
      expect(res.json().error.code).toBe('RATE_LIMIT');
    });

    it('does NOT mask an unexpected datastore error as 400 on register (→ 500)', async () => {
      mockLimit.mockRejectedValue(new Error('db down'));

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: USER.email, password: 'password123', name: 'Budi' },
      });

      expect(res.statusCode).toBe(500);
    });

    it('does NOT mask an unexpected datastore error as 400 on login (→ 500)', async () => {
      mockLimit.mockRejectedValue(new Error('db down'));

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: USER.email, password: 'password123' },
      });

      expect(res.statusCode).toBe(500);
    });

    it('GET /me returns 404 when the user no longer exists', async () => {
      mockLimit.mockResolvedValue([]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { authorization: `Bearer ${app.jwt.sign({ id: USER.id })}` },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    });
  });
});
