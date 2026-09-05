import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

const { chain, returningResult, db, bcrypt } = vi.hoisted(() => {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    groupBy: vi.fn(),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.offset.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.groupBy.mockReturnValue(chain);

  const returningResult = vi.fn();

  const db = {
    select: vi.fn().mockReturnValue(chain),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: returningResult,
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: returningResult,
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn(),
    }),
    execute: vi.fn(),
    query: {
      users: { findMany: vi.fn() },
      addresses: { findMany: vi.fn() },
    },
  };

  const bcrypt = { hash: vi.fn(), compare: vi.fn() };

  return { chain, returningResult, db, bcrypt };
});

vi.mock('@/db', () => ({ db }));
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
    vi.resetAllMocks();
    chain.from.mockReturnValue(chain);
    chain.where.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    chain.offset.mockReturnValue(chain);
    chain.innerJoin.mockReturnValue(chain);
    chain.leftJoin.mockReturnValue(chain);
    chain.groupBy.mockReturnValue(chain);
    db.select.mockReturnValue(chain);
    db.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: returningResult,
      }),
    });
    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: returningResult,
        }),
      }),
    });
    db.delete.mockReturnValue({
      where: vi.fn(),
    });
    bcrypt.hash.mockResolvedValue('new-hash');
    bcrypt.compare.mockResolvedValue(true);
  });

  // ==================== PROFILE ====================
  describe('GET /api/users/me', () => {
    it('returns the current user profile', async () => {
      // Route: db.query.users.findMany({where, columns, limit: 1})
      db.query.users.findMany.mockResolvedValueOnce([
        { id: USER_ID, email: 'budi@example.com', name: 'Budi' },
      ]);

      const res = await app.inject({ method: 'GET', url: '/api/users/me', headers: authHeader(app) });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.id).toBe(USER_ID);
    });

    it('returns 404 when the user no longer exists', async () => {
      db.query.users.findMany.mockResolvedValueOnce([]);

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
      // Route: db.update(users).set(updateData).where(eq(...)).returning()
      returningResult.mockResolvedValueOnce([
        { id: USER_ID, name: 'Budi Baru', phone: '0899' },
      ]);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/users/me',
        headers: authHeader(app),
        payload: { name: 'Budi Baru', phone: '0899' },
      });

      expect(res.statusCode).toBe(200);
      expect(db.update).toHaveBeenCalled();
    });
  });

  // ==================== CHANGE PASSWORD ====================
  describe('PUT /api/users/me/password', () => {
    it('changes the password with a valid current password', async () => {
      // Route: db.query.users.findMany({where, limit: 1}) → user with passwordHash
      db.query.users.findMany.mockResolvedValueOnce([
        { id: USER_ID, passwordHash: 'old-hash' },
      ]);
      // Route: bcrypt.compare → true
      bcrypt.compare.mockResolvedValue(true);
      // Route: db.update(users).set({passwordHash}).where(eq(...)) (no returning!)

      const res = await app.inject({
        method: 'PUT',
        url: '/api/users/me/password',
        headers: authHeader(app),
        payload: { currentPassword: 'oldpass12', newPassword: 'newpass123' },
      });

      expect(res.statusCode).toBe(200);
      expect(db.update).toHaveBeenCalled();
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
      db.query.users.findMany.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/users/me/password',
        headers: authHeader(app),
        payload: { currentPassword: 'oldpass12', newPassword: 'newpass123' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 400 INVALID_PASSWORD when the current password is wrong', async () => {
      db.query.users.findMany.mockResolvedValueOnce([
        { id: USER_ID, passwordHash: 'old-hash' },
      ]);
      bcrypt.compare.mockResolvedValue(false);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/users/me/password',
        headers: authHeader(app),
        payload: { currentPassword: 'wrongpass', newPassword: 'newpass123' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('INVALID_PASSWORD');
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  // ==================== ADDRESSES ====================
  describe('GET /api/users/me/addresses', () => {
    it('lists the user addresses', async () => {
      // Route: db.query.addresses.findMany({where, orderBy})
      db.query.addresses.findMany.mockResolvedValueOnce([
        { id: ADDR_ID, ...ADDRESS_BODY, isDefault: true },
      ]);

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
      // Route: no isDefault → skip update
      // Route: db.insert(addresses).values({...}).returning()
      returningResult.mockResolvedValueOnce([{ id: ADDR_ID, ...ADDRESS_BODY }]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/users/me/addresses',
        headers: authHeader(app),
        payload: ADDRESS_BODY,
      });

      expect(res.statusCode).toBe(201);
      expect(db.update).not.toHaveBeenCalled();
    });

    it('resets other defaults when the new address is default', async () => {
      // Route: isDefault=true → db.update(addresses).set({isDefault: false}).where(eq(...))
      // Route: db.insert(addresses).values({...}).returning()
      returningResult.mockResolvedValueOnce([
        { id: ADDR_ID, ...ADDRESS_BODY, isDefault: true },
      ]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/users/me/addresses',
        headers: authHeader(app),
        payload: { ...ADDRESS_BODY, isDefault: true },
      });

      expect(res.statusCode).toBe(201);
      expect(db.update).toHaveBeenCalled();
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
      // Route: db.query.addresses.findMany({where, limit: 1}) → existing address
      db.query.addresses.findMany.mockResolvedValueOnce([{ id: ADDR_ID, userId: USER_ID }]);
      // Route: isDefault=true → db.update(addresses).set({isDefault: false}).where(eq(...))
      // Route: db.update(addresses).set(updateData).where(eq(...)).returning()
      returningResult.mockResolvedValueOnce([{ id: ADDR_ID, ...ADDRESS_BODY, city: 'Bandung' }]);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/me/addresses/${ADDR_ID}`,
        headers: authHeader(app),
        payload: { city: 'Bandung', isDefault: true },
      });

      expect(res.statusCode).toBe(200);
      expect(db.update).toHaveBeenCalled();
    });

    it('returns 404 when the address is not owned', async () => {
      db.query.addresses.findMany.mockResolvedValueOnce([]);

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
      // Route: db.query.addresses.findMany({where, limit: 1}) → existing address
      db.query.addresses.findMany.mockResolvedValueOnce([{ id: ADDR_ID, userId: USER_ID }]);
      // Route: db.delete(addresses).where(eq(...))
      const whereMock = vi.fn();
      db.delete.mockReturnValueOnce({ where: whereMock });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/users/me/addresses/${ADDR_ID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(db.delete).toHaveBeenCalled();
    });

    it('returns 404 when the address does not exist', async () => {
      db.query.addresses.findMany.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/users/me/addresses/${ADDR_ID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
