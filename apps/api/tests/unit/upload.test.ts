import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';

const configHolder = vi.hoisted(() => ({
  config: {
    storage: { uploadPath: '/tmp/oblintz-uploads-test', maxFileSize: 5 * 1024 * 1024 },
  },
}));

const fsMock = vi.hoisted(() => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock('@/config', () => ({ config: configHolder.config }));
vi.mock('fs/promises', () => ({ default: fsMock, ...fsMock }));

import { uploadRoutes } from '@/modules/upload/upload.routes';

const BOUNDARY = '----testboundaryOBLINTZ';

function fileMultipart(filename: string, contentType: string, content: Buffer | string) {
  const pre = Buffer.from(
    `--${BOUNDARY}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: ${contentType}\r\n\r\n`
  );
  const post = Buffer.from(`\r\n--${BOUNDARY}--\r\n`);
  const body = Buffer.concat([pre, Buffer.from(content), post]);
  return { body, headers: { 'content-type': `multipart/form-data; boundary=${BOUNDARY}` } };
}

function fieldMultipart() {
  const body = Buffer.from(
    `--${BOUNDARY}\r\nContent-Disposition: form-data; name="foo"\r\n\r\nbar\r\n--${BOUNDARY}--\r\n`
  );
  return { body, headers: { 'content-type': `multipart/form-data; boundary=${BOUNDARY}` } };
}

function adminHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: 'admin-1', role: 'ADMIN' })}` };
}
function userHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: 'user-1' })}` };
}

describe('upload module', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: 'test-jwt-secret-min-32-characters!!' });
    await app.register(multipart);
    await app.register(uploadRoutes, { prefix: '/api/upload' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    fsMock.mkdir.mockResolvedValue(undefined);
    fsMock.writeFile.mockResolvedValue(undefined);
    fsMock.unlink.mockResolvedValue(undefined);
    configHolder.config.storage.maxFileSize = 5 * 1024 * 1024;
  });

  // ==================== UPLOAD SINGLE ====================
  describe('POST /api/upload/image', () => {
    it('rejects non-admin users (403)', async () => {
      const { body, headers } = fileMultipart('a.png', 'image/png', 'data');
      const res = await app.inject({
        method: 'POST',
        url: '/api/upload/image',
        headers: { ...userHeader(app), ...headers },
        payload: body,
      });

      expect(res.statusCode).toBe(403);
    });

    it('uploads a valid image', async () => {
      const { body, headers } = fileMultipart('foto.png', 'image/png', 'binary-image-bytes');
      const res = await app.inject({
        method: 'POST',
        url: '/api/upload/image',
        headers: { ...adminHeader(app), ...headers },
        payload: body,
      });

      expect(res.statusCode).toBe(201);
      const data = res.json().data;
      expect(data.url).toMatch(/^\/uploads\/images\/[a-f0-9]{32}\.png$/);
      expect(data.originalName).toBe('foto.png');
      expect(fsMock.writeFile).toHaveBeenCalledTimes(1);
    });

    it('rejects a disallowed file type (400)', async () => {
      const { body, headers } = fileMultipart('note.txt', 'text/plain', 'hello');
      const res = await app.inject({
        method: 'POST',
        url: '/api/upload/image',
        headers: { ...adminHeader(app), ...headers },
        payload: body,
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('INVALID_TYPE');
    });

    it('returns 400 NO_FILE when no file part is present', async () => {
      const { body, headers } = fieldMultipart();
      const res = await app.inject({
        method: 'POST',
        url: '/api/upload/image',
        headers: { ...adminHeader(app), ...headers },
        payload: body,
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('NO_FILE');
    });

    it('returns 400 FILE_TOO_LARGE when exceeding the size limit', async () => {
      configHolder.config.storage.maxFileSize = 3; // 3 bytes
      const { body, headers } = fileMultipart('big.png', 'image/png', 'this-is-too-long');
      const res = await app.inject({
        method: 'POST',
        url: '/api/upload/image',
        headers: { ...adminHeader(app), ...headers },
        payload: body,
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('FILE_TOO_LARGE');
    });
  });

  // ==================== UPLOAD MULTIPLE ====================
  describe('POST /api/upload/images', () => {
    it('uploads a valid image in a batch', async () => {
      const { body, headers } = fileMultipart('foto.jpg', 'image/jpeg', 'bytes');
      const res = await app.inject({
        method: 'POST',
        url: '/api/upload/images',
        headers: { ...adminHeader(app), ...headers },
        payload: body,
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().data.count).toBe(1);
    });

    it('skips disallowed types without hanging and returns an empty result (H1)', async () => {
      const { body, headers } = fileMultipart('note.txt', 'text/plain', 'hello');
      const res = await app.inject({
        method: 'POST',
        url: '/api/upload/images',
        headers: { ...adminHeader(app), ...headers },
        payload: body,
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().data.count).toBe(0);
    });
  });

  // ==================== DELETE ====================
  describe('DELETE /api/upload/image', () => {
    it('deletes a valid uploaded file', async () => {
      fsMock.unlink.mockResolvedValue(undefined);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/upload/image',
        headers: adminHeader(app),
        payload: { url: '/uploads/images/abc.png' },
      });

      expect(res.statusCode).toBe(200);
      expect(fsMock.unlink).toHaveBeenCalled();
    });

    it('returns 400 for a URL outside the uploads path', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/upload/image',
        headers: adminHeader(app),
        payload: { url: 'https://evil.com/x.png' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('INVALID_URL');
    });

    it('returns 400 for a path traversal attempt', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/upload/image',
        headers: adminHeader(app),
        payload: { url: '/uploads/../../etc/passwd' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('INVALID_URL');
    });

    it('returns 404 when the file does not exist', async () => {
      fsMock.unlink.mockRejectedValue(new Error('ENOENT'));

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/upload/image',
        headers: adminHeader(app),
        payload: { url: '/uploads/images/missing.png' },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    });
  });
});
