import mongoose from 'mongoose';
import AuthService from '../../app/services/AuthService';
import User, { IUser, UserRole } from '../../app/models/User';
import Artist from '../../app/models/Artist';
import { initializeDatabase, closeDatabase } from '../../app/config/database';
import jwt from 'jsonwebtoken';
import { AppError } from '../../app/middleware/errorHandler';

describe('AuthService', () => {
  beforeAll(async () => {
    await initializeDatabase();
    // Clean up any test users
    await User.deleteMany({ email: /@serviceexample.com/ });
    await Artist.deleteMany({ email: /@serviceexample.com/ });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@serviceexample.com/ });
    await Artist.deleteMany({ email: /@serviceexample.com/ });
    await closeDatabase();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await User.deleteMany({});
    await Artist.deleteMany({});
  });

  describe('register method', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'testservice@serviceexample.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'Service'
      };

      const result = await AuthService.register(userData);

      // Check if the result has the expected properties
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email', userData.email);
      expect(result.user).toHaveProperty('firstName', userData.firstName);
      expect(result.user).toHaveProperty('lastName', userData.lastName);
      expect(result.user).toHaveProperty('role', UserRole.USER);

      // Verify token is a valid JWT
      const decoded = jwt.verify(result.token, process.env.JWT_SECRET!) as any;
      expect(decoded).toHaveProperty('id', result.user.id);
      expect(decoded).toHaveProperty('email', userData.email);
      expect(decoded).toHaveProperty('role', UserRole.USER);
    });

    it('should throw error when registering with existing email', async () => {
      // First register a user
      const userData = {
        email: 'testduplicate@serviceexample.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'Duplicate'
      };

      await AuthService.register(userData);

      // Try to register again with the same email
      await expect(AuthService.register(userData)).rejects.toThrow('Email already in use');
    });

    it('should allow custom role when registering', async () => {
      const userData = {
        email: 'testartist@serviceexample.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'Artist',
        role: UserRole.ARTIST
      };

      const result = await AuthService.register(userData);

      expect(result.user).toHaveProperty('role', UserRole.ARTIST);
    });
  });

  describe('login method', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await AuthService.register({
        email: 'testlogin@serviceexample.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'Login'
      });
    });

    it('should login successfully with correct credentials', async () => {
      const loginData = {
        email: 'testlogin@serviceexample.com',
        password: 'Password123!'
      };

      const result = await AuthService.login(loginData);

      // Check if the result has the expected properties
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user).toHaveProperty('email', loginData.email);
      expect(result.user).toHaveProperty('role', UserRole.USER);

      // Verify token is a valid JWT
      const decoded = jwt.verify(result.token, process.env.JWT_SECRET!) as any;
      expect(decoded).toHaveProperty('id', result.user.id);
      expect(decoded).toHaveProperty('email', loginData.email);
    });

    it('should throw error when logging in with wrong password', async () => {
      const loginData = {
        email: 'testlogin@serviceexample.com',
        password: 'WrongPassword123!'
      };

      await expect(AuthService.login(loginData)).rejects.toThrow('Invalid email or password');
    });

    it('should throw error when logging in with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@serviceexample.com',
        password: 'Password123!'
      };

      await expect(AuthService.login(loginData)).rejects.toThrow('Invalid email or password');
    });
  });


  describe('upgradeTo method', () => {
    let userId: string;

    beforeEach(async () => {
      // Create a test user for role upgrade
      const result = await AuthService.register({
        email: 'testupgrade@serviceexample.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'Upgrade'
      });
      userId = result.user.id;
    });

    it('should upgrade user role successfully', async () => {
      const upgradeData = {
        userId,
        role: UserRole.ADMIN
      };

      const result = await AuthService.upgradeTo(upgradeData);

      expect(result).toHaveProperty('role', UserRole.ADMIN);
      expect(result).toHaveProperty('_id');
      expect((result._id as IUser).toString()).toBe(userId);

      // Verify user was updated in database
      const user = await User.findById(userId);
      expect(user).toHaveProperty('role', UserRole.ADMIN);
    });

    it('should throw error when upgrading non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const upgradeData = {
        userId: nonExistentId,
        role: UserRole.ADMIN
      };

      await expect(AuthService.upgradeTo(upgradeData))
        .rejects.toThrow('User not found');
    });
  });
});