import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import prisma from '../../config/database';
import { redis } from '../../config/redis';
import { requireAuth } from '../../middleware/auth';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from './auth.schema';
import {
  sendEmail,
  welcomeEmail,
  resetPasswordEmail,
  otpEmail,
} from '../../lib/email';

export async function authRoutes(app: FastifyInstance) {
  // ==================== REGISTER ====================
  app.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string', minLength: 2 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const input = registerSchema.parse(request.body);

      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        return reply.status(409).send({
          success: false,
          error: { code: 'CONFLICT', message: 'Email sudah terdaftar' },
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 12);

      const user = await prisma.user.create({
        data: {
          email: input.email,
          phone: input.phone,
          passwordHash,
          name: input.name,
        },
      });

      const accessToken = app.jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        { expiresIn: '15m' }
      );

      const refreshToken = app.jwt.sign(
        { id: user.id },
        { expiresIn: '7d' }
      );

      // Simpan refresh token di Redis
      await redis.set(`refresh:${user.id}`, refreshToken, 'EX', 7 * 24 * 60 * 60);

      // Kirim email welcome
      const welcome = welcomeEmail(user.name);
      await sendEmail({ to: user.email, ...welcome });

      return reply.status(201).send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.message },
        });
      }
      throw error;
    }
  });

  // ==================== LOGIN ====================
  app.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const input = loginSchema.parse(request.body);

      const user = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Email atau password salah' },
        });
      }

      const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);

      if (!isValidPassword) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Email atau password salah' },
        });
      }

      const accessToken = app.jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        { expiresIn: '15m' }
      );

      const refreshToken = app.jwt.sign(
        { id: user.id },
        { expiresIn: '7d' }
      );

      await redis.set(`refresh:${user.id}`, refreshToken, 'EX', 7 * 24 * 60 * 60);

      return reply.status(200).send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.message },
        });
      }
      throw error;
    }
  });

  // ==================== LOGOUT ====================
  app.post('/logout', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    // Hapus refresh token dari Redis
    await redis.del(`refresh:${request.userId}`);

    return reply.status(200).send({
      success: true,
      data: { message: 'Berhasil logout' },
    });
  });

  // ==================== REFRESH TOKEN ====================
  app.post('/refresh', async (request, reply) => {
    try {
      const { refreshToken } = request.body as { refreshToken: string };

      if (!refreshToken) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Refresh token diperlukan' },
        });
      }

      const decoded = app.jwt.verify<{ id: string }>(refreshToken);

      // Cek apakah refresh token masih valid di Redis
      const storedToken = await redis.get(`refresh:${decoded.id}`);
      if (storedToken !== refreshToken) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Refresh token tidak valid' },
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User tidak ditemukan' },
        });
      }

      const accessToken = app.jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        { expiresIn: '15m' }
      );

      const newRefreshToken = app.jwt.sign(
        { id: user.id },
        { expiresIn: '7d' }
      );

      // Update refresh token di Redis
      await redis.set(`refresh:${user.id}`, newRefreshToken, 'EX', 7 * 24 * 60 * 60);

      return reply.status(200).send({
        success: true,
        data: { accessToken, refreshToken: newRefreshToken },
      });
    } catch {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Refresh token tidak valid atau kedaluwarsa' },
      });
    }
  });

  // ==================== GET CURRENT USER ====================
  app.get('/me', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        avatar: true,
        role: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' },
      });
    }

    return reply.status(200).send({ success: true, data: user });
  });

  // ==================== FORGOT PASSWORD ====================
  app.post('/forgot-password', {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const input = forgotPasswordSchema.parse(request.body);

      const user = await prisma.user.findUnique({
        where: { email: input.email },
      });

      // Selalu return success untuk prevent email enumeration
      if (!user) {
        return reply.status(200).send({
          success: true,
          data: { message: 'Jika email terdaftar, link reset password telah dikirim' },
        });
      }

      // Generate token
      const resetToken = nanoid(64);
      const tokenHash = await bcrypt.hash(resetToken, 12);

      // Simpan token hash di Redis dengan TTL 1 jam
      await redis.set(`reset:${user.id}:${resetToken}`, tokenHash, 'EX', 60 * 60);

      // Kirim email
      const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&userId=${user.id}`;
      const email = resetPasswordEmail(user.name, resetUrl);
      await sendEmail({ to: user.email, ...email });

      return reply.status(200).send({
        success: true,
        data: { message: 'Jika email terdaftar, link reset password telah dikirim' },
      });
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.message },
        });
      }
      throw error;
    }
  });

  // ==================== RESET PASSWORD ====================
  app.post('/reset-password', {
    schema: {
      body: {
        type: 'object',
        required: ['token', 'userId', 'password'],
        properties: {
          token: { type: 'string' },
          userId: { type: 'string' },
          password: { type: 'string', minLength: 8 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { token, userId, password } = request.body as {
        token: string;
        userId: string;
        password: string;
      };

      if (!token || !userId || !password) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Token, userId, dan password diperlukan' },
        });
      }

      // Cari token di Redis
      const keys = await redis.keys(`reset:${userId}:*`);
      if (keys.length === 0) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Token tidak valid atau kedaluwarsa' },
        });
      }

      const storedHash = await redis.get(keys[0]);
      if (!storedHash) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Token tidak valid atau kedaluwarsa' },
        });
      }

      const isValidToken = await bcrypt.compare(token, storedHash);
      if (!isValidToken) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Token tidak valid' },
        });
      }

      // Update password
      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      // Hapus token dari Redis
      await redis.del(...keys);

      return reply.status(200).send({
        success: true,
        data: { message: 'Password berhasil direset' },
      });
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.message },
        });
      }
      throw error;
    }
  });

  // ==================== OTP SEND ====================
  app.post('/otp/send', {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { email } = request.body as { email: string };

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return reply.status(200).send({
          success: true,
          data: { message: 'Jika email terdaftar, kode OTP telah dikirim' },
        });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Simpan di Redis dengan TTL 5 menit
      await redis.set(`otp:${email}`, otp, 'EX', 5 * 60);

      // Kirim email
      const emailContent = otpEmail(user.name, otp);
      await sendEmail({ to: email, ...emailContent });

      return reply.status(200).send({
        success: true,
        data: { message: 'Jika email terdaftar, kode OTP telah dikirim' },
      });
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.message },
        });
      }
      throw error;
    }
  });

  // ==================== OTP VERIFY ====================
  app.post('/otp/verify', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'otp'],
        properties: {
          email: { type: 'string', format: 'email' },
          otp: { type: 'string', minLength: 6, maxLength: 6 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const input = verifyOtpSchema.parse(request.body);

      const storedOtp = await redis.get(`otp:${input.email}`);

      if (!storedOtp || storedOtp !== input.otp) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_OTP', message: 'Kode OTP tidak valid atau kedaluwarsa' },
        });
      }

      // Hapus OTP dari Redis
      await redis.del(`otp:${input.email}`);

      // Update email verified
      await prisma.user.update({
        where: { email: input.email },
        data: { emailVerified: true },
      });

      return reply.status(200).send({
        success: true,
        data: { message: 'Email berhasil diverifikasi' },
      });
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.message },
        });
      }
      throw error;
    }
  });
}
