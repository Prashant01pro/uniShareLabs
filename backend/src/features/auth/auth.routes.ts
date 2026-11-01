import { Router } from 'express';
import { authController } from './auth.controller';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  profileUpdateSchema,
} from './auth.validation';
import { authenticateUser, requireRoles } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';

export const authRouter: Router = Router();

authRouter.post('/register', validateBody(registerSchema), (req, res, next) =>
  authController.register(req, res, next)
);

authRouter.post('/login', validateBody(loginSchema), (req, res, next) =>
  authController.login(req, res, next)
);

authRouter.post('/refresh', validateBody(refreshTokenSchema), (req, res, next) =>
  authController.refresh(req, res, next)
);

authRouter.post('/refresh-token', validateBody(refreshTokenSchema), (req, res, next) =>
  authController.refresh(req, res, next)
);

authRouter.post('/logout', (req, res, next) =>
  authController.logout(req, res, next)
);

authRouter.get('/demo-tokens', (req, res, next) =>
  authController.getDemoTokens(req, res, next)
);

authRouter.get('/me', authenticateUser, (req, res, next) =>
  authController.getMe(req, res, next)
);

authRouter.patch('/profile', authenticateUser, validateBody(profileUpdateSchema), (req, res, next) =>
  authController.updateProfile(req, res, next)
);

authRouter.get(
  '/test-manager-only',
  authenticateUser,
  requireRoles('LAB_MANAGER', 'ADMIN'),
  (req, res) => {
    res.status(200).json({ success: true, message: 'Manager access granted' });
  }
);

export default authRouter;
