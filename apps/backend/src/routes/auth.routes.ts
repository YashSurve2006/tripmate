import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { prisma } from '../prisma';
import { ConflictError, UnauthorizedError } from '../utils/errors';
import { signToken } from '../utils/jwt';
import { sendSuccess } from '../utils/response';

export const authRouter = Router();

const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    upiId: z.string().optional(),
    avatarUrl: z.string().url().optional().or(z.literal('')),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

authRouter.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, name, upiId, avatarUrl } = req.body;

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        upiId: upiId || null,
        avatarUrl: avatarUrl || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        upiId: true,
        avatarUrl: true,
        currencyPref: true,
        createdAt: true,
      },
    });

    const token = signToken({ userId: user.id, email: user.email });

    return sendSuccess(res, { user, token }, 201);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = signToken({ userId: user.id, email: user.email });

    return sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        upiId: user.upiId,
        avatarUrl: user.avatarUrl,
        currencyPref: user.currencyPref,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        upiId: true,
        avatarUrl: true,
        currencyPref: true,
        themePref: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User session invalid');
    }

    return sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
});
