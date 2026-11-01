import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { UserRole } from '../features/auth/user.model';
import { jwtService } from '../features/auth/jwt.service';
import { UnauthorizedError, ForbiddenError } from './error.middleware';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  department: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function extractTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization || (req.headers.Authorization as string);
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[1].trim() !== '') {
      return parts[1].trim();
    }
  }

  if (req.cookies) {
    if (req.cookies.accessToken) {
      return req.cookies.accessToken;
    }
    if (req.cookies.jwt) {
      return req.cookies.jwt;
    }
  }

  return null;
}

export function authenticateUser(req: Request, res: Response, next: NextFunction): void {
  const token = extractTokenFromRequest(req);

  if (!token) {
    return next(new UnauthorizedError('Authentication token is required', 'AUTH_TOKEN_MISSING'));
  }

  try {
    const payload = jwtService.verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      department: payload.department,
      name: payload.name,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function optionalAuthenticateUser(req: Request, res: Response, next: NextFunction): void {
  const token = extractTokenFromRequest(req);
  if (!token) {
    return next();
  }

  try {
    const payload = jwtService.verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      department: payload.department,
      name: payload.name,
    };
  } catch {
  }
  next();
}

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required for this resource', 'AUTH_TOKEN_MISSING'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access forbidden: required role(s) [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
          'FORBIDDEN_INSUFFICIENT_ROLE'
        )
      );
    }

    next();
  };
}

export interface ObjectAccessContext {
  ownerId: string | mongoose.Types.ObjectId;
  department?: string;
  delegates?: Array<string | mongoose.Types.ObjectId>;
}

export function checkObjectAccess(
  user: AuthenticatedUser,
  resource: ObjectAccessContext,
  options: { allowDeptManager?: boolean } = { allowDeptManager: true }
): boolean {
  if (user.role === 'ADMIN') {
    return true;
  }

  const ownerIdStr = resource.ownerId.toString();
  if (user.id === ownerIdStr) {
    return true;
  }

  if (resource.delegates && resource.delegates.length > 0) {
    const isDelegate = resource.delegates.some(
      (d) => d.toString() === user.id
    );
    if (isDelegate) {
      return true;
    }
  }

  if (
    options.allowDeptManager &&
    user.role === 'LAB_MANAGER' &&
    resource.department &&
    user.department.toLowerCase() === resource.department.toLowerCase()
  ) {
    return true;
  }

  return false;
}

export function requireObjectOwnerOrRoles(
  getResourceInfo: (req: Request) => Promise<ObjectAccessContext | null>,
  ...allowedRoles: UserRole[]
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required', 'AUTH_TOKEN_MISSING'));
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    try {
      const resourceInfo = await getResourceInfo(req);
      if (!resourceInfo) {
        return next(new ForbiddenError('Resource not found or access denied', 'FORBIDDEN_OBJECT_ACCESS'));
      }

      const hasAccess = checkObjectAccess(req.user, resourceInfo);
      if (!hasAccess) {
        return next(
          new ForbiddenError('You do not have permission to modify or access this resource', 'FORBIDDEN_OBJECT_ACCESS')
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
