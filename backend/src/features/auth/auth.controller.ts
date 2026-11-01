import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from './user.model';
import { jwtService } from './jwt.service';
import {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  ProfileUpdateInput,
} from './auth.validation';
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '../../middleware/error.middleware';

function setTokenCookies(res: Response, accessToken: string, refreshToken: string): void {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, 
    path: '/api/v1/auth',
  });

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, 
    path: '/',
  });
}

function clearTokenCookies(res: Response): void {
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
  res.clearCookie('accessToken', { path: '/' });
}

export class AuthController {
  public async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as RegisterInput;

      const existingUser = await User.findByEmail(input.email);
      if (existingUser) {
        throw new ConflictError(
          `A user with email ${input.email} is already registered.`,
          'EMAIL_ALREADY_EXISTS'
        );
      }

      const quotaLimit = User.getDefaultQuotaForRole(input.role || 'STUDENT');

      const newUser = new User({
        name: input.name,
        email: input.email,
        passwordHash: input.password,
        role: input.role || 'STUDENT',
        department: input.department,
        labGroupId: input.labGroupId,
        certifications: input.certifications || [],
        weeklyQuotaLimitHours: quotaLimit,
        weeklyQuotaUsedHours: 0,
        trustScore: 85,
        reputationPoints: 80,
        lastActiveAt: new Date(),
      });

      await newUser.save();

      const tokens = await jwtService.generateTokens(newUser);
      setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

      res.status(201).json({
        success: true,
        user: newUser.toJSON(),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      });
    } catch (err) {
      next(err);
    }
  }

  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body as LoginInput;

      const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
      if (!user) {
        throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
      }

      if (user.isSuspended) {
        throw new ForbiddenError(
          `Your account is suspended: ${user.suspensionReason || 'Compliance violation'}`,
          'ACCOUNT_SUSPENDED'
        );
      }

      if (!user.isActive) {
        throw new ForbiddenError('Your account has been deactivated', 'ACCOUNT_INACTIVE');
      }

      user.lastActiveAt = new Date();
      await user.save();

      const tokens = await jwtService.generateTokens(user);
      setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

      res.status(200).json({
        success: true,
        user: user.toJSON(),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      });
    } catch (err) {
      next(err);
    }
  }

  public async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken = req.body?.refreshToken || req.cookies?.refreshToken;

      if (!rawToken) {
        throw new BadRequestError('Refresh token is required', 'AUTH_TOKEN_MISSING');
      }

      const newTokens = await jwtService.rotateRefreshToken(rawToken);
      setTokenCookies(res, newTokens.accessToken, newTokens.refreshToken);

      res.status(200).json({
        success: true,
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresIn: newTokens.expiresIn,
      });
    } catch (err) {
      next(err);
    }
  }

  public async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken = req.body?.refreshToken || req.cookies?.refreshToken;
      if (rawToken) {
        await jwtService.revokeRefreshToken(rawToken, 'USER_LOGOUT');
      }

      clearTokenCookies(res);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  public async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required', 'AUTH_TOKEN_MISSING');
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        throw new NotFoundError('User profile not found', 'USER_NOT_FOUND');
      }

      const remainingQuota = user.getRemainingWeeklyQuota();

      res.status(200).json({
        success: true,
        user: user.toJSON(),
        quotas: {
          weeklyLimitHours: user.weeklyQuotaLimitHours,
          weeklyUsedHours: user.weeklyQuotaUsedHours,
          weeklyRemainingHours: remainingQuota,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required', 'AUTH_TOKEN_MISSING');
      }

      const input = req.body as ProfileUpdateInput;
      const user = await User.findById(req.user.id);
      if (!user) {
        throw new NotFoundError('User not found', 'USER_NOT_FOUND');
      }

      if (input.name) user.name = input.name;
      if (input.department) user.department = input.department;
      if (input.labGroupId !== undefined) user.labGroupId = input.labGroupId;
      if (input.certifications) user.certifications = input.certifications;
      if (input.weeklyQuotaOverrides) {
        user.weeklyQuotaOverrides = new Map(Object.entries(input.weeklyQuotaOverrides));
      }

      await user.save();

      res.status(200).json({
        success: true,
        user: user.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }

  public async getDemoTokens(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roles: UserRole[] = [
        'STUDENT',
        'RESEARCHER',
        'RESOURCE_OWNER',
        'LAB_MANAGER',
        'ADMIN',
      ];

      const personas: Record<string, any> = {};
      const tokens: Record<string, any> = {};

      for (const role of roles) {
        let user = await User.findOne({ role, isActive: true });

        if (!user) {
          const defaultEmail = `${role.toLowerCase()}@unishare.edu`;
          user = await User.create({
            name: `Demo ${role.replace('_', ' ')}`,
            email: defaultEmail,
            passwordHash: 'DemoPassword123!',
            role,
            department: 'Materials Science & Engineering',
            weeklyQuotaLimitHours: User.getDefaultQuotaForRole(role),
            weeklyQuotaUsedHours: 0,
            trustScore: 90,
            reputationPoints: 85,
          });
        }

        const tokenPair = await jwtService.generateTokens(user);
        personas[role] = {
          user: user.toJSON(),
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
        };
        tokens[role] = {
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
        };
      }

      res.status(200).json({
        success: true,
        personas,
        tokens,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
