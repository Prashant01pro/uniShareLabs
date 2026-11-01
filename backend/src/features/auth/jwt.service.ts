import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { IUser, UserRole, User } from './user.model';
import { RefreshToken } from './refresh-token.model';
import { UnauthorizedError } from '../../middleware/error.middleware';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  department: string;
  name: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
  family: string;
  iat?: number;
  exp?: number;
}

export interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number; 
}

export class JwtService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: string = '15m';
  private readonly refreshExpiresIn: string = '7d';
  private readonly accessExpiresInSeconds: number = 900; 

  constructor() {
    this.accessSecret =
      process.env.JWT_ACCESS_SECRET ||
      process.env.JWT_SECRET ||
      'unishare-default-access-secret-32-chars-minimum!';
    this.refreshSecret =
      process.env.JWT_REFRESH_SECRET ||
      process.env.JWT_SECRET ||
      'unishare-default-refresh-secret-32-chars-minimum!';
  }

  public hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  public async generateTokens(
    user: IUser & { _id: any; id?: string },
    family?: string
  ): Promise<TokenPairResponse> {
    const userId = user._id ? user._id.toString() : user.id!;
    const tokenId = crypto.randomUUID();
    const tokenFamily = family || crypto.randomUUID();

    const accessPayload: AccessTokenPayload = {
      sub: userId,
      email: user.email,
      role: user.role,
      department: user.department,
      name: user.name,
    };

    const accessToken = jwt.sign(accessPayload, this.accessSecret, {
      expiresIn: this.accessExpiresIn as unknown as SignOptions['expiresIn'],
    });

    const refreshPayload: RefreshTokenPayload = {
      sub: userId,
      tokenId,
      family: tokenFamily,
    };

    const refreshToken = jwt.sign(refreshPayload, this.refreshSecret, {
      expiresIn: this.refreshExpiresIn as unknown as SignOptions['expiresIn'],
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 
    const tokenHash = this.hashToken(refreshToken);

    await RefreshToken.create({
      tokenId,
      tokenHash,
      userId: new mongoose.Types.ObjectId(userId),
      family: tokenFamily,
      isRevoked: false,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.accessExpiresInSeconds,
    };
  }

  public generateAccessToken(user: IUser & { _id: any; id?: string }): string {
    const userId = user._id ? user._id.toString() : user.id!;
    const accessPayload: AccessTokenPayload = {
      sub: userId,
      email: user.email,
      role: user.role,
      department: user.department,
      name: user.name,
    };

    return jwt.sign(accessPayload, this.accessSecret, {
      expiresIn: this.accessExpiresIn as unknown as SignOptions['expiresIn'],
    });
  }

  public verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const decoded = jwt.verify(token, this.accessSecret) as any;
      const sub = decoded.sub || decoded.id;
      if (!sub || !decoded.role) {
        throw new UnauthorizedError('Token payload is missing required claims', 'AUTH_TOKEN_INVALID');
      }
      return {
        sub: String(sub),
        email: decoded.email,
        role: decoded.role,
        department: decoded.department,
        name: decoded.name,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch (err: any) {
      if (err instanceof UnauthorizedError) {
        throw err;
      }
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Access token has expired', 'AUTH_TOKEN_EXPIRED');
      }
      throw new UnauthorizedError('Invalid access token signature', 'AUTH_TOKEN_INVALID');
    }
  }

  public async rotateRefreshToken(rawRefreshToken: string): Promise<TokenPairResponse> {
    let payload: RefreshTokenPayload;

    try {
      payload = jwt.verify(rawRefreshToken, this.refreshSecret) as RefreshTokenPayload;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Refresh token has expired. Please log in again.', 'AUTH_TOKEN_EXPIRED');
      }
      throw new UnauthorizedError('Invalid refresh token signature', 'AUTH_TOKEN_INVALID');
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const existingRecord = await RefreshToken.findOne({
      $or: [{ tokenId: payload.tokenId }, { tokenHash }],
    });

    if (!existingRecord) {
      throw new UnauthorizedError('Refresh token not recognized or already purged', 'AUTH_TOKEN_INVALID');
    }

    if (existingRecord.isRevoked) {
      await RefreshToken.updateMany(
        { family: existingRecord.family },
        { isRevoked: true, revokedReason: 'BREACH_REUSE_DETECTED' }
      );

      throw new UnauthorizedError(
        'Refresh token reuse detected. All active sessions in this family have been invalidated for security.',
        'AUTH_TOKEN_REUSED'
      );
    }

    const user = await User.findById(payload.sub);
    if (!user || !user.isActive || user.isSuspended) {
      throw new UnauthorizedError('User account is inactive or suspended', 'ACCOUNT_SUSPENDED');
    }

    const newTokens = await this.generateTokens(user, existingRecord.family);
    const newDecoded = jwt.decode(newTokens.refreshToken) as RefreshTokenPayload;

    existingRecord.isRevoked = true;
    existingRecord.revokedReason = 'ROTATED';
    existingRecord.replacedByTokenId = newDecoded?.tokenId;
    await existingRecord.save();

    return newTokens;
  }

  public async revokeRefreshToken(rawRefreshToken: string, reason: string = 'USER_LOGOUT'): Promise<void> {
    try {
      const payload = jwt.verify(rawRefreshToken, this.refreshSecret) as RefreshTokenPayload;
      await RefreshToken.updateOne(
        { tokenId: payload.tokenId },
        { isRevoked: true, revokedReason: reason }
      );
    } catch {
      const tokenHash = this.hashToken(rawRefreshToken);
      await RefreshToken.updateOne(
        { tokenHash },
        { isRevoked: true, revokedReason: reason }
      );
    }
  }

  public async revokeAllUserTokens(userId: string, reason: string = 'REVOKE_ALL'): Promise<void> {
    await RefreshToken.updateMany(
      { userId: new mongoose.Types.ObjectId(userId) },
      { isRevoked: true, revokedReason: reason }
    );
  }
}

export const jwtService = new JwtService();

export function generateAccessToken(user: IUser & { _id: any; id?: string }): string {
  return jwtService.generateAccessToken(user);
}
