import jwt from "jsonwebtoken";
import User, { IUser, UserRole } from "../models/User";
import { AppError } from "../middleware/errorHandler";
import { jwtPayload } from "../interfaces/jwtPayload";
import "dotenv/config";
import bcrypt from "bcryptjs";
import { AuthResponse, LoginCredentials, RegisterUserInput, UpgradeUserInput } from "../interfaces/auth.interface";
import Artist from "../models/Artist";
import { ObjectId } from "mongoose";

class AuthService {
  /**
   * Register a new user
   */
  async register(userData: RegisterUserInput): Promise<AuthResponse> {
    // Check if user exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new AppError('Email already in use', 400);
    }

    // Create new user
    const user = await User.create({
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role || UserRole.USER,
      phoneNumber: userData.phoneNumber
    });

    // Generate JWT token
    const jwtPayload = this.generateJwtPayloadPayload(user);
    const token = this.generateToken(jwtPayload);

    return {
      user: this.formatUserResponse(user),
      token
    };
  }

  /**
   * Login a user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Find user by email
    const user = await User.findOne({ email: credentials.email }).select('+password');

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check if password is correct
    const isPasswordValid = await this.comparePassword(credentials.password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // Generate JWT token
    const jwtPayload = this.generateJwtPayloadPayload(user);
    const token = this.generateToken(jwtPayload);

    return {
      user: this.formatUserResponse(user),
      token
    };
  }

  /**
   * Register as artist
   * @param userId - User ID to register as artist
   * @param artistData - Artist profile data
   */
  async registerAsArtist(userId: string, artistData: any): Promise<any> {
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if user is already an artist
    const existingArtist = await Artist.findOne({ user: userId });
    if (existingArtist) {
      throw new AppError('User is already registered as an artist', 400);
    }

    // Update user role to artist
    user.role = UserRole.ARTIST;
    await user.save();

    // Create artist profile
    const artist = await Artist.create({
      user: userId,
      ...artistData
    });

    return artist;
  }

  /**
   * Upgrade a user role to admin
   * @param userId - ID of the user to upgrade
   * @returns - Updated user data
   */
  async upgradeTo(upgradeInput: UpgradeUserInput): Promise<IUser> {
    const user = await User.findOneAndUpdate(
      { _id: upgradeInput.userId },
      { role: upgradeInput.role },
      { new: true }
    );

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }

  /**
   * Generate JWT token for authenticated user
   */
  private generateToken(user: jwtPayload): string {
    return jwt.sign(user, process.env.JWT_SECRET!, {
      expiresIn: "1d",
    });
  }

  /**
   * Validate password
   * @param candidatePassword - Password provided by the user
   * @param userPassword - Password stored in the database
   * @returns - True if passwords match, false otherwise
   * @description - This method uses bcrypt to compare the provided password with the hashed password stored in the database.
   */
  private async comparePassword(
    candidatePassword: string,
    userPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(candidatePassword, userPassword);
  }

  private generateJwtPayloadPayload(user: IUser): jwtPayload {
    return {
      id: user._id!.toString(),
      email: user.email,
      role: user.role,
    };
  }

  private formatUserResponse(user: IUser): AuthResponse["user"] {
    return {
      id: (user._id as ObjectId).toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    };
  }
}

export default new AuthService();
