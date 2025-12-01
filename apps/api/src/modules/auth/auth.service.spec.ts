import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { SubscriptionTier } from '@audionest/database';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  // Test fixtures
  const mockUser = {
    id: 'user-001',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: '$2b$10$hashedpassword',
    subscription: 'FREE' as SubscriptionTier,
    subscriptionExpiresAt: null,
    coins: 0,
    avatarUrl: null,
    totalListenTime: 0,
    totalEpisodesCompleted: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastListenDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOAuthUser = {
    ...mockUser,
    id: 'user-oauth-001',
    email: 'oauth@example.com',
    username: 'oauthuser',
    passwordHash: null, // OAuth users don't have password
  };

  const mockVipUser = {
    ...mockUser,
    id: 'user-vip-001',
    email: 'vip@example.com',
    username: 'vipuser',
    subscription: 'VIP' as SubscriptionTier,
    coins: 100,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findByUsername: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    /**
     * @test Valid email and password returns user object without passwordHash
     * @security Ensures password hash is never returned
     */
    it('should return user when email and password are valid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        avatarUrl: mockUser.avatarUrl,
        subscription: mockUser.subscription,
        coins: mockUser.coins,
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.passwordHash);
    });

    /**
     * @test Non-existent email returns null
     * @security Prevents user enumeration by returning same response as invalid password
     */
    it('should return null when email does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password123');

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    /**
     * @test Invalid password returns null
     */
    it('should return null when password is invalid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    /**
     * @test OAuth user (no passwordHash) returns null
     * @security OAuth users should not be able to login with password
     */
    it('should return null for OAuth user without passwordHash', async () => {
      usersService.findByEmail.mockResolvedValue(mockOAuthUser);

      const result = await service.validateUser('oauth@example.com', 'anypassword');

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      username: 'newuser',
      password: 'Password123!',
    };

    /**
     * @test Successful registration creates user and returns tokens
     */
    it('should create user and return tokens on successful registration', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashedpassword');

      const createdUser = {
        ...mockUser,
        email: registerDto.email,
        username: registerDto.username,
      };
      usersService.create.mockResolvedValue(createdUser);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(registerDto.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(usersService.create).toHaveBeenCalledWith({
        email: registerDto.email,
        username: registerDto.username,
        passwordHash: '$2b$10$hashedpassword',
      });
    });

    /**
     * @test Duplicate email throws ConflictException
     */
    it('should throw ConflictException when email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow('Email already exists');
      expect(usersService.create).not.toHaveBeenCalled();
    });

    /**
     * @test Duplicate username throws ConflictException
     */
    it('should throw ConflictException when username already exists', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow('Username already exists');
      expect(usersService.create).not.toHaveBeenCalled();
    });

    /**
     * @test Password is hashed with bcrypt cost factor 10
     * @security Ensures password is properly hashed before storage
     */
    it('should hash password with cost factor 10', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashedpassword');
      usersService.create.mockResolvedValue({
        ...mockUser,
        email: registerDto.email,
        username: registerDto.username,
      });

      await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    /**
     * @test Successful login returns token pair
     */
    it('should return tokens on successful login', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.id).toBe(mockUser.id);
      expect(jwtService.sign).toHaveBeenCalledTimes(2); // accessToken and refreshToken
    });

    /**
     * @test Invalid credentials throws UnauthorizedException
     * @security Generic error message prevents user enumeration
     */
    it('should throw UnauthorizedException for invalid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    /**
     * @test Wrong password throws UnauthorizedException
     */
    it('should throw UnauthorizedException for wrong password', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    /**
     * @test VIP user login includes subscription in payload
     */
    it('should include subscription tier in JWT payload for VIP user', async () => {
      usersService.findByEmail.mockResolvedValue(mockVipUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'vip@example.com',
        password: 'password123',
      });

      expect(result.user.subscription).toBe('VIP');
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription: 'VIP',
        }),
        expect.any(Object),
      );
    });
  });

  describe('refreshToken', () => {
    /**
     * @test Successful token refresh returns new token pair
     */
    it('should return new tokens for valid user', async () => {
      usersService.findById.mockResolvedValue(mockUser);

      const result = await service.refreshToken(mockUser.id);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.id).toBe(mockUser.id);
    });

    /**
     * @test Non-existent user throws UnauthorizedException
     * @security Prevents token refresh for deleted users
     */
    it('should throw UnauthorizedException when user not found', async () => {
      usersService.findById.mockRejectedValue(new UnauthorizedException('User not found'));

      await expect(service.refreshToken('non-existent-id')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('generateTokens (private method via login)', () => {
    /**
     * @test Access token has default expiration
     */
    it('should generate access token with default expiration', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      // First call is for accessToken (default expiration)
      expect(jwtService.sign).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          subscription: mockUser.subscription,
        }),
      );
    });

    /**
     * @test Refresh token has 30 day expiration
     */
    it('should generate refresh token with 30d expiration', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      // Second call is for refreshToken (30d expiration)
      expect(jwtService.sign).toHaveBeenNthCalledWith(
        2,
        expect.any(Object),
        { expiresIn: '30d' },
      );
    });

    /**
     * @test User object in response excludes sensitive data
     * @security Ensures passwordHash is never included in response
     */
    it('should exclude sensitive data from user response', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('username');
      expect(result.user).toHaveProperty('avatarUrl');
      expect(result.user).toHaveProperty('subscription');
      expect(result.user).toHaveProperty('coins');
    });
  });
});
