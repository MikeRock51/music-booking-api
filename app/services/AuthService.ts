import jwt from "jsonwebtoken";
import User, { IUser, UserRole } from "../models/User";
import { AppError } from "../middleware/errorHandler";
import { jwtPayload } from "../interfaces/jwtPayload";
import "dotenv/config";
import bcrypt from "bcryptjs";
import { AuthResponse, RegisterUserInput } from "../interfaces/auth.interface";


class AuthService {
  /**
   * Register a new user
   */
  async register(userData: RegisterUserInput): Promise<AuthResponsee> {
    // Check if email already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new AppError("Email already in use", 409);
    }

    // Create new user
    const user = await User.create(userData);
    const payload = this.generateJwtPayloadPayload(user);

    // Generate JWT token
    const token = this.generateToken(payload);

    return {
      user: {
        id: user._id!.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
    };
  }

  /**
   * Login a user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Find user by email and include password field explicitly
    const user = await User.findOne({ email: credentials.email }).select(
      "+password"
    );

    // Check if user exists
    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    // Check if password is correct
    const isPasswordMatch = await this.comparePassword(
      credentials.password,
      user.password
    );

    if (!isPasswordMatch) {
      throw new AppError("Invalid email or password", 401);
    }

    const payload = this.generateJwtPayloadPayload(user);
    const token = this.generateToken(payload);

    return {
      user: {
        id: user._id!.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
    };
  }

  /**
   * Upgrade a user role to admin
   * @param userId - ID of the user to upgrade
   * @returns - Updated user data
   */
  async upgradeToAdmin(userId: string): Promise<IUser> {
    const user = await User.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.role === UserRole.ADMIN) {
      throw new AppError("User is already an admin", 400);
    }

    user.role = UserRole.ADMIN;
    await user.save();

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

  // /**
  //  * Verify token and return user data
  //  */
  // async verifyToken(token: string): Promise<IUser | null> {
  //   try {
  //     const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
  //     const user = await User.findById(decoded.id);
  //     return user;
  //   } catch (error) {
  //     return null;
  //   }
  // }

  private generateJwtPayloadPayload(user: IUser): jwtPayload {
    return {
      id: user._id!.toString(),
      email: user.email,
      role: user.role,
    };
  }
}

export default new AuthService();
