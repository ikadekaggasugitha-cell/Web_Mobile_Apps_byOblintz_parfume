import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import prisma from '../../config/database';
import { RegisterInput, LoginInput, registerSchema, loginSchema } from './auth.schema';

export async function authRoutes(app: FastifyInstance) {
  // Register
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
      
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Email already registered',
          },
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: input.email,
          phone: input.phone,
          passwordHash,
          name: input.name,
        },
      });

      // Generate tokens
      const accessToken = app.jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        { expiresIn: '15m' }
      );
      
      const refreshToken = app.jwt.sign(
        { id: user.id },
        { expiresIn: '7d' }
      );

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
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
      throw error;
    }
  });

  // Login
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
      
      // Find user
      const user = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password',
          },
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
      
      if (!isValidPassword) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password',
          },
        });
      }

      // Generate tokens
      const accessToken = app.jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        { expiresIn: '15m' }
      );
      
      const refreshToken = app.jwt.sign(
        { id: user.id },
        { expiresIn: '7d' }
      );

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
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
      throw error;
    }
  });

  // Refresh token
  app.post('/refresh', async (request, reply) => {
    try {
      const { refreshToken } = request.body as { refreshToken: string };
      
      if (!refreshToken) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Refresh token required',
          },
        });
      }

      const decoded = app.jwt.verify<{ id: string }>(refreshToken);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not found',
          },
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

      return reply.status(200).send({
        success: true,
        data: {
          accessToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid refresh token',
        },
      });
    }
  });

  // Get current user
  app.get('/me', {
    preHandler: [async (request, reply) => {
      try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'No token' } });
        }
        const decoded = app.jwt.verify<{ id: string }>(token);
        request.userId = decoded.id;
      } catch {
        return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
      }
    }],
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
        createdAt: true,
      },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    return reply.status(200).send({
      success: true,
      data: user,
    });
  });
}
