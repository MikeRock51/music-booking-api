import Artist from "../app/models/Artist";
import User, { UserRole } from "../app/models/User";
import jwt from "jsonwebtoken";
import 'dotenv/config';

export async function createTestUser(userData: any) {
  return await User.create(userData);
}

export async function createTestArtist(artistData: any) {
  return await Artist.create(artistData);
}

export function createToken(user: any) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );
}

export const testUserData = {
  email: `user${Date.now()}@artisttest.com`,
  password: "Password123!",
  firstName: "Test",
  lastName: "User",
  role: UserRole.USER,
};

export const testArtistUserData = {
  email: `artist${Date.now()}@artisttest.com`,
  password: "Password123!",
  firstName: "Test",
  lastName: "Artist",
  role: UserRole.ARTIST,
};
