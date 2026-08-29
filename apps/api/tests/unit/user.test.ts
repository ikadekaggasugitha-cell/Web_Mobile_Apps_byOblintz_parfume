import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

const prisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  address: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
}));

const bcrypt = vi.hoisted(() => ({ hash: vi.fn(), compare: vi.fn() }));

vi.mock('@/config/database', () => ({ default: prisma, prisma }));
vi.mock('bcrypt', () => ({ default: bcrypt, ...bcrypt }));

import { userRoutes } from '@/modules/user/user.routes';

const USER_ID = 'user-1';
const ADDR_ID = 'addr-1';

function authHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: USER_ID })}` };
}

const ADDRESS_BODY = {
  name: 'Budi',
  phone: '081234567890',
  address: 'Jl. Merdeka No. 1',
  city: 'Jakarta',
  province: 'DKI Jakarta',
  postalCode: '12345',
};

describe('user module', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: 'test-jwt-secret-min-32-characters!!' });
    await app.register(userRoutes, { prefix: '/api/users' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    bcrypt.hash.mockResolvedValue('new-hash');
    bcrypt.compare.mockResolvedValue(true);
    prisma.address.updateMany.mockResolvedValue({ count: 0 });
  });

  // ==================== PROFILE ====================
  describe('GET /api/users/me', () => {
    it('returns the current user profile', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: USER_ID, email: 'budi@example.com', name: 'Budi' });

      const res = await app.inject({ method: 'GET', url: '/api/users/me', headers: authHeader(app) });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.id).toBe(USER_ID);
    });

    it('returns 404 when the user no longer exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const res = await app.inject({ method: 'GET', url: '/api/users/me', headers: authHeader(app) });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    });

    it('returns 401 without a token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/users/me' });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('PUT /api/users/me', () => {
    it('updates the profile fields provided', async () => {
      prisma.user.update.mockResolvedValue({ id: USER_ID, name: 'Budi Baru', phone: '0899' });

      const res = await app.inject({
        method: 'PUT',
        url: '/api/users/me',
        headers: authHeader(app),
        payload: { name: 'Budi Baru', phone: '0899' },
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: USER_ID },
          data: expect.objectContaining({ name: 'Budi Baru', phone: '0899' }),
        })
      );
    });
  });

  // ==================== CHANGE PASSWORD ====================
  describe('PUT /api/users/me/password', () => {
    it('changes the password with a valid current password', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: USER_ID, passwordHash: 'old-hash' });
      bcrypt.compare.mockResolvedValue(true);
      prisma.user.update.mockResolvedValue({ id: USER_ID });

      const res = await app.inject({
        method: 'PUT',
        url: '/api/users/me/password',
        headers: authHeader(app),
        payload: { currentPassword: 'oldpass12', newPassword: 'newpass123' },
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { passwordHash: 'new-hash' },
      });
    });

    it('returns 400 when fields are missing', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/users/me/password',
        headers: authHeader(app),
        payload: { currentPassword: 'oldpass12' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when the new password is too short', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/users/me/password',
        headers: authHeader(app),
        payload: { currentPassword: 'oldpass12', newPassword: 'short' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when the user is missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/users/me/password',
        headers: authHeader(app),
        payload: { currentPassword: 'oldpass12', newPassword: 'newpass123' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 400 INVALID_PASSWORD when the current password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: USER_ID, passwordHash: 'old-hash' });
      bcrypt.compare.mockResolvedValue(false);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/users/me/password',
        headers: authHeader(app),
        payload: { currentPassword: 'wrongpass', newPassword: 'newpass123' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('INVALID_PASSWORD');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  // ==================== ADDRESSES ====================
  describe('GET /api/users/me/addresses', () => {
    it('lists the user addresses', async () => {
      prisma.address.findMany.mockResolvedValue([{ id: ADDR_ID, ...ADDRESS_BODY, isDefault: true }]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/users/me/addresses',
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(1);
    });
  });

  describe('POST /api/users/me/addresses', () => {
    it('adds a new address', async () => {
      prisma.address.create.mockResolvedValue({ id: ADDR_ID, ...ADDRESS_BODY });

      const res = await app.inject({
        method: 'POST',
        url: '/api/users/me/addresses',
        headers: authHeader(app),
        payload: ADDRESS_BODY,
      });

      expect(res.statusCode).toBe(201);
      expect(prisma.address.updateMany).not.toHaveBeenCalled();
    });

    it('resets other defaults when the new address is default', async () => {
      prisma.address.create.mockResolvedValue({ id: ADDR_ID, ...ADDRESS_BODY, isDefault: true });

      const res = await app.inject({
        method: 'POST',
        url: '/api/users/me/addresses',
        headers: authHeader(app),
        payload: { ...ADDRESS_BODY, isDefault: true },
      });

      expect(res.statusCode).toBe(201);
      expect(prisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        data: { isDefault: false },
      });
    });

    it('returns 400 when a required field is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/users/me/addresses',
        headers: authHeader(app),
        payload: { name: 'Budi' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/users/me/addresses/:id', () => {
    it('updates an owned address', async () => {
      prisma.address.findFirst.mockResolvedValue({ id: ADDR_ID, userId: USER_ID });
      prisma.address.update.mockResolvedValue({ id: ADDR_ID, ...ADDRESS_BODY, city: 'Bandung' });

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/me/addresses/${ADDR_ID}`,
        headers: authHeader(app),
        payload: { city: 'Bandung', isDefault: true },
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.address.updateMany).toHaveBeenCalled();
      expect(prisma.address.update).toHaveBeenCalled();
    });

    it('returns 404 when the address is not owned', async () => {
      prisma.address.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/me/addresses/${ADDR_ID}`,
        headers: authHeader(app),
        payload: { city: 'Bandung' },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/users/me/addresses/:id', () => {
    it('deletes an owned address', async () => {
      prisma.address.findFirst.mockResolvedValue({ id: ADDR_ID, userId: USER_ID });
      prisma.address.delete.mockResolvedValue({ id: ADDR_ID });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/users/me/addresses/${ADDR_ID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.address.delete).toHaveBeenCalledWith({ where: { id: ADDR_ID } });
    });

    it('returns 404 when the address does not exist', async () => {
      prisma.address.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/users/me/addresses/${ADDR_ID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
