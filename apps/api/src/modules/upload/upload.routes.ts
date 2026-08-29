import { FastifyInstance } from 'fastify';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { config } from '../../config';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const UPLOAD_DIR = path.resolve(config.storage.uploadPath);

async function ensureUploadDir(subdir: string) {
  const dir = path.join(UPLOAD_DIR, subdir);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function getFileExtension(filename: string): string {
  const ext = path.extname(filename);
  return ext.toLowerCase();
}

function isAllowedImage(ext: string): boolean {
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
}

export async function uploadRoutes(app: FastifyInstance) {
  // ==================== UPLOAD SINGLE IMAGE ====================
  app.post('/image', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    try {
      const parts = request.parts();
      let file: any = null;

      for await (const part of parts) {
        if (part.type === 'file') {
          file = part;
          break;
        }
      }

      if (!file) {
        return reply.status(400).send({
          success: false,
          error: { code: 'NO_FILE', message: 'Tidak ada file yang diupload' },
        });
      }

      const ext = getFileExtension(file.filename);

      if (!isAllowedImage(ext)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_TYPE',
            message: 'Tipe file tidak diizinkan. Gunakan: jpg, jpeg, png, gif, webp',
          },
        });
      }

      // Check file size (max 5MB)
      const chunks: Buffer[] = [];
      let totalSize = 0;

      for await (const chunk of file.file) {
        totalSize += chunk.length;
        if (totalSize > config.storage.maxFileSize) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'FILE_TOO_LARGE',
              message: `Ukuran file maksimal ${config.storage.maxFileSize / 1024 / 1024}MB`,
            },
          });
        }
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);

      // Generate unique filename
      const uniqueName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
      const subdir = 'images';
      const uploadDir = await ensureUploadDir(subdir);
      const filePath = path.join(uploadDir, uniqueName);

      await fs.writeFile(filePath, buffer);

      const url = `/uploads/${subdir}/${uniqueName}`;

      return reply.status(201).send({
        success: true,
        data: {
          url,
          filename: uniqueName,
          originalName: file.filename,
          size: buffer.length,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(500).send({
          success: false,
          error: { code: 'UPLOAD_ERROR', message: error.message },
        });
      }
      throw error;
    }
  });

  // ==================== UPLOAD MULTIPLE IMAGES ====================
  app.post('/images', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    try {
      const parts = request.parts();
      const uploadResults: any[] = [];

      for await (const part of parts) {
        if (part.type !== 'file') continue;

        const ext = getFileExtension(part.filename);

        if (!isAllowedImage(ext)) {
          continue;
        }

        const chunks: Buffer[] = [];
        let totalSize = 0;
        let skipped = false;

        for await (const chunk of part.file) {
          totalSize += chunk.length;
          if (totalSize > config.storage.maxFileSize) {
            skipped = true;
            break;
          }
          chunks.push(chunk);
        }

        if (skipped) continue;

        const buffer = Buffer.concat(chunks);
        const uniqueName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
        const subdir = 'images';
        const uploadDir = await ensureUploadDir(subdir);
        const filePath = path.join(uploadDir, uniqueName);

        await fs.writeFile(filePath, buffer);

        uploadResults.push({
          url: `/uploads/${subdir}/${uniqueName}`,
          filename: uniqueName,
          originalName: part.filename,
          size: buffer.length,
        });
      }

      return reply.status(201).send({
        success: true,
        data: { files: uploadResults, count: uploadResults.length },
      });
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(500).send({
          success: false,
          error: { code: 'UPLOAD_ERROR', message: error.message },
        });
      }
      throw error;
    }
  });

  // ==================== DELETE IMAGE ====================
  app.delete('/image', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { url } = request.body as { url: string };

    if (!url || !url.startsWith('/uploads/')) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_URL', message: 'URL tidak valid' },
      });
    }

    const relativePath = url.replace('/uploads/', '');
    const filePath = path.resolve(UPLOAD_DIR, relativePath);

    if (!filePath.startsWith(UPLOAD_DIR)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_URL', message: 'URL tidak valid' },
      });
    }

    try {
      await fs.unlink(filePath);
    } catch {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'File tidak ditemukan' },
      });
    }

    return reply.status(200).send({
      success: true,
      data: { message: 'File berhasil dihapus' },
    });
  });
}
