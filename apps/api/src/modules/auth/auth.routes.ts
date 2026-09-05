import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { users } from '../../db/schema'
import { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { nanoid } from 'nanoid'
import { redis } from '../../config/redis'
import { requireAuth } from '../../middleware/auth'
import { handleRouteError } from '../../lib/errors'
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from './auth.schema'
import {
  sendEmail,
  welcomeEmail,
  resetPasswordEmail,
  otpEmail,
} from '../../lib/email'

const RATE_LIMIT_WINDOW = 60

async function checkRateLimit(key: string, maxRequests: number): Promise<boolean> {
  const current = await redis.incr(key)
  if (current === 1) {
    await redis.expire(key, RATE_LIMIT_WINDOW)
  }
  return current > maxRequests
}

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
      const clientIp = request.ip
      if (await checkRateLimit(`rl:register:${clientIp}`, 5)) {
        return reply.status(429).send({
          success: false,
          error: { code: 'RATE_LIMIT', message: 'Terlalu banyak percobaan registrasi, coba lagi nanti' },
        })
      }

      const input = registerSchema.parse(request.body)

      const existingUser = await db.select().from(users).where(eq(users.email, input.email)).limit(1)

      if (existingUser.length > 0) {
        return reply.status(409).send({
          success: false,
          error: { code: 'CONFLICT', message: 'Email sudah terdaftar' },
        })
      }

      const passwordHash = await bcrypt.hash(input.password, 12)

      const [user] = await db.insert(users).values({
        email: input.email,
        phone: input.phone,
        passwordHash,
        name: input.name,
      }).returning()

      const accessToken = app.jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        { expiresIn: '15m' }
      )

      const refreshToken = app.jwt.sign(
        { id: user.id },
        { expiresIn: '7d' }
      )

      await redis.set(`refresh:${user.id}`, refreshToken, 'EX', 7 * 24 * 60 * 60)

      const welcome = welcomeEmail(user.name)
      await sendEmail({ to: user.email, ...welcome })

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
      })
    } catch (error) {
      return handleRouteError(error, reply)
    }
  })

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
      const clientIp = request.ip
      if (await checkRateLimit(`rl:login:${clientIp}`, 10)) {
        return reply.status(429).send({
          success: false,
          error: { code: 'RATE_LIMIT', message: 'Terlalu banyak percobaan login, coba lagi nanti' },
        })
      }

      const input = loginSchema.parse(request.body)

      const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1)

      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Email atau password salah' },
        })
      }

      const isValidPassword = await bcrypt.compare(input.password, user.passwordHash)

      if (!isValidPassword) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Email atau password salah' },
        })
      }

      const accessToken = app.jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        { expiresIn: '15m' }
      )

      const refreshToken = app.jwt.sign(
        { id: user.id },
        { expiresIn: '7d' }
      )

      await redis.set(`refresh:${user.id}`, refreshToken, 'EX', 7 * 24 * 60 * 60)

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
      })
    } catch (error) {
      return handleRouteError(error, reply)
    }
  })

  // ==================== LOGOUT ====================
  app.post('/logout', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    await redis.del(`refresh:${request.userId}`)

    return reply.status(200).send({
      success: true,
      data: { message: 'Berhasil logout' },
    })
  })

  // ==================== REFRESH TOKEN ====================
  app.post('/refresh', async (request, reply) => {
    try {
      const { refreshToken } = request.body as { refreshToken: string }

      if (!refreshToken) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Refresh token diperlukan' },
        })
      }

      const decoded = app.jwt.verify<{ id: string }>(refreshToken)

      const storedToken = await redis.get(`refresh:${decoded.id}`)
      if (storedToken !== refreshToken) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Refresh token tidak valid' },
        })
      }

      const [user] = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1)

      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User tidak ditemukan' },
        })
      }

      const accessToken = app.jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        { expiresIn: '15m' }
      )

      const newRefreshToken = app.jwt.sign(
        { id: user.id },
        { expiresIn: '7d' }
      )

      await redis.set(`refresh:${user.id}`, newRefreshToken, 'EX', 7 * 24 * 60 * 60)

      return reply.status(200).send({
        success: true,
        data: { accessToken, refreshToken: newRefreshToken },
      })
    } catch {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Refresh token tidak valid atau kedaluwarsa' },
      })
    }
  })

  // ==================== GET CURRENT USER ====================
  app.get('/me', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        phone: users.phone,
        name: users.name,
        avatar: users.avatar,
        role: users.role,
        emailVerified: users.emailVerified,
        phoneVerified: users.phoneVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, request.userId!))
      .limit(1)

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' },
      })
    }

    return reply.status(200).send({ success: true, data: user })
  })

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
      const clientIp = request.ip
      if (await checkRateLimit(`rl:forgot:${clientIp}`, 5)) {
        return reply.status(429).send({
          success: false,
          error: { code: 'RATE_LIMIT', message: 'Terlalu banyak permintaan, coba lagi nanti' },
        })
      }

      const input = forgotPasswordSchema.parse(request.body)

      const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1)

      if (!user) {
        return reply.status(200).send({
          success: true,
          data: { message: 'Jika email terdaftar, link reset password telah dikirim' },
        })
      }

      const resetToken = nanoid(64)
      const tokenHash = await bcrypt.hash(resetToken, 12)

      await redis.set(`reset:${user.id}`, tokenHash, 'EX', 60 * 60)

      const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&userId=${user.id}`
      const email = resetPasswordEmail(user.name, resetUrl)
      await sendEmail({ to: user.email, ...email })

      return reply.status(200).send({
        success: true,
        data: { message: 'Jika email terdaftar, link reset password telah dikirim' },
      })
    } catch (error) {
      return handleRouteError(error, reply)
    }
  })

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
        token: string
        userId: string
        password: string
      }

      if (!token || !userId || !password) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Token, userId, dan password diperlukan' },
        })
      }

      const storedHash = await redis.get(`reset:${userId}`)
      if (!storedHash) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Token tidak valid atau kedaluwarsa' },
        })
      }

      const isValidToken = await bcrypt.compare(token, storedHash)
      if (!isValidToken) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Token tidak valid' },
        })
      }

      const passwordHash = await bcrypt.hash(password, 12)
      await db.update(users).set({ passwordHash }).where(eq(users.id, userId))

      await redis.del(`reset:${userId}`)

      return reply.status(200).send({
        success: true,
        data: { message: 'Password berhasil direset' },
      })
    } catch (error) {
      return handleRouteError(error, reply)
    }
  })

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
      const clientIp = request.ip
      if (await checkRateLimit(`rl:otp:${clientIp}`, 3)) {
        return reply.status(429).send({
          success: false,
          error: { code: 'RATE_LIMIT', message: 'Terlalu banyak permintaan OTP, coba lagi nanti' },
        })
      }

      const { email } = request.body as { email: string }

      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
      if (!user) {
        return reply.status(200).send({
          success: true,
          data: { message: 'Jika email terdaftar, kode OTP telah dikirim' },
        })
      }

      const otp = crypto.randomInt(100000, 999999).toString()

      const otpHash = await bcrypt.hash(otp, 10)
      await redis.set(`otp:${email}`, otpHash, 'EX', 5 * 60)

      const emailContent = otpEmail(user.name, otp)
      await sendEmail({ to: email, ...emailContent })

      return reply.status(200).send({
        success: true,
        data: { message: 'Jika email terdaftar, kode OTP telah dikirim' },
      })
    } catch (error) {
      return handleRouteError(error, reply)
    }
  })

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
      const input = verifyOtpSchema.parse(request.body)

      const storedOtpHash = await redis.get(`otp:${input.email}`)

      if (!storedOtpHash) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_OTP', message: 'Kode OTP tidak valid atau kedaluwarsa' },
        })
      }

      const isValidOtp = await bcrypt.compare(input.otp, storedOtpHash)
      if (!isValidOtp) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_OTP', message: 'Kode OTP tidak valid atau kedaluwarsa' },
        })
      }

      await redis.del(`otp:${input.email}`)

      await db.update(users).set({ emailVerified: true }).where(eq(users.email, input.email))

      return reply.status(200).send({
        success: true,
        data: { message: 'Email berhasil diverifikasi' },
      })
    } catch (error) {
      return handleRouteError(error, reply)
    }
  })
}
