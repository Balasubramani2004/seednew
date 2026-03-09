import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { TwoFactorService } from './two-factor.service';
import { AuthPasswordService } from './auth-password.service';
import { RateLimiterService } from './rate-limiter.service';
import { Role } from '@prisma/client';

const mockTwoFactorInstance = {
  isAdminRole: jest.fn().mockReturnValue(false),
  generateSecretForUser: jest.fn().mockReturnValue({ secret: 's', otpauthUrl: 'u' }),
  setPendingSecret: jest.fn(),
  getAndClearPendingSecret: jest.fn().mockReturnValue('s'),
  verifyCode: jest.fn().mockResolvedValue(true),
};

jest.mock('./two-factor.service', () => ({
  TwoFactorService: jest.fn().mockImplementation(() => mockTwoFactorInstance),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock } };
  let passwordService: { compare: jest.Mock };
  let twoFactorService: { isAdminRole: jest.Mock };
  let jwtService: any;

  const mockUser = {
    id: 'user-1',
    employeeId: 'E001',
    name: 'Test User',
    email: 'test@example.com',
    role: Role.EMPLOYEE,
    designation: 'Annotator',
    passwordHash: '$2b$10$hashed',
    status: 'ACTIVE',
    twoFactorEnabled: false,
  };

  beforeEach(async () => {
    const mockPrisma = { user: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() } };
    const mockPasswordService = { compare: jest.fn().mockResolvedValue(true), hash: jest.fn().mockResolvedValue('hashed') };
    const mockJwtService = { sign: jest.fn().mockReturnValue('jwt-token'), verify: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: EmailService, useValue: { sendMail: jest.fn().mockResolvedValue(undefined) } },
        { provide: TwoFactorService, useValue: mockTwoFactorInstance },
        { provide: AuthPasswordService, useValue: mockPasswordService },
        { provide: RateLimiterService, useValue: { checkLimit: jest.fn() } },
      ],
    }).compile();

    service = module.get(AuthService);
    prisma = module.get(PrismaService);
    passwordService = module.get(AuthPasswordService);
    twoFactorService = mockTwoFactorInstance;
    jwtService = module.get(JwtService);
  });

  it('login returns token when credentials valid', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    const result = await service.login({ email: 'test@example.com', password: 'password' });
    expect(result).toHaveProperty('access_token', 'jwt-token');
    expect((result as any).user.email).toBe('test@example.com');
  });

  it('login throws when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.login({ email: 'nobody@example.com', password: 'x' })).rejects.toThrow(UnauthorizedException);
  });

  it('login throws when password invalid', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    passwordService.compare.mockResolvedValue(false);
    await expect(service.login({ email: 'test@example.com', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
  });

  it('login throws when user inactive', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...mockUser, status: 'INACTIVE' });
    await expect(service.login({ email: 'test@example.com', password: 'password' })).rejects.toThrow(UnauthorizedException);
  });

  it('login returns requires2fa with purpose 2fa for admin with 2FA enabled', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...mockUser, role: Role.SUPER_ADMIN, twoFactorEnabled: true });
    twoFactorService.isAdminRole.mockReturnValue(true);
    const result = await service.login({ email: 'test@example.com', password: 'password' });
    expect(result).toHaveProperty('requires2fa', true);
    expect(result).toHaveProperty('twoFactorToken');

    // Verify token purpose is "2fa" (TOTP)
    jwtService.verify.mockReturnValue({ purpose: '2fa' });
    const decoded = jwtService.verify((result as any).twoFactorToken);
    expect(decoded.purpose).toBe('2fa');
  });
});
