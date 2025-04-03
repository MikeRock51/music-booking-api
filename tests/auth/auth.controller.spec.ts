import request from "supertest";
import { createApp } from "../../app/createApp";
import { initializeDatabase, closeDatabase } from "../../app/config/database";
import User, { UserRole } from "../../app/models/User";
import mongoose from "mongoose";

describe("AuthController", () => {
  const app = createApp();
  let userToken: string;
  let userId: string;
  let adminToken: string;

  beforeAll(async () => {
    await initializeDatabase();
    await User.deleteMany({ email: /@controllerexample.com/ });

    // Create test user
    const userData = {
      email: "test1@controllerexample.com",
      password: "Password123!",
      firstName: "Test",
      lastName: "User",
    };

    const userResponse = await request(app)
      .post("/v1/auth/register")
      .send(userData);

    userId = userResponse.body.data.user.id;
    userToken = userResponse.body.data.token;

    // Create admin user for testing
    const adminUser = await User.create({
      email: "testadmin@controllerexample.com",
      password: "Password123!",
      firstName: "Admin",
      lastName: "User",
      role: UserRole.ADMIN,
    });

    // Login as admin to get token
    const loginResponse = await request(app).post("/v1/auth/login").send({
      email: "testadmin@controllerexample.com",
      password: "Password123!",
    });

    adminToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@controllerexample.com/ });
    await closeDatabase();
  });

  describe("POST /v1/auth/register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        email: "test15@controllerexample.com",
        password: "Password123!",
        firstName: "Test",
        lastName: "User",
      };

      const response = await request(app)
        .post("/v1/auth/register")
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty("id");
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.role).toBe(UserRole.USER);
      expect(response.body.data.token).toBeDefined();
    });

    it("should return 409 when registering with existing email", async () => {
      const userData = {
        email: "test1@controllerexample.com",
        password: "Password123!",
        firstName: "Test",
        lastName: "User",
      };

      const response = await request(app)
        .post("/v1/auth/register")
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toContain("Email already in use");
    });

    it("should validate required registration fields", async () => {
      const userData = {
        email: "test2@controllerexample.com",
        // missing required fields
      };

      const response = await request(app)
        .post("/v1/auth/register")
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
    });
  });

  describe("POST /v1/auth/login", () => {
    it("should login successfully with valid credentials", async () => {
      const loginData = {
        email: "test1@controllerexample.com",
        password: "Password123!",
      };

      const response = await request(app)
        .post("/v1/auth/login")
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty("id");
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.token).toBeDefined();
    });

    it("should return 401 with invalid credentials", async () => {
      const loginData = {
        email: "test1@controllerexample.com",
        password: "WrongPassword123!",
      };

      const response = await request(app)
        .post("/v1/auth/login")
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.status).toBe("error");
    });

    it("should return 401 with non-existent user", async () => {
      const loginData = {
        email: "nonexistent@controllerexample.com",
        password: "Password123!",
      };

      const response = await request(app)
        .post("/v1/auth/login")
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.status).toBe("error");
    });
  });

  describe("GET /v1/auth/me", () => {
    it("should return user profile when authenticated", async () => {
      const response = await request(app)
        .get("/v1/auth/me")
        .set("Authorization", `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("_id", userId);
      expect(response.body.data).toHaveProperty(
        "email",
        "test1@controllerexample.com"
      );
    });

    it("should return 401 when no token is provided", async () => {
      const response = await request(app).get("/v1/auth/me");

      expect(response.status).toBe(401);
      expect(response.body.status).toBe("error");
    });

    it("should return 401 when invalid token is provided", async () => {
      const response = await request(app)
        .get("/v1/auth/me")
        .set("Authorization", "Bearer invalidtoken");

      expect(response.status).toBe(401);
      expect(response.body.status).toBe("error");
    });
  });

  describe("POST /v1/auth/user/upgrade", () => {
    it("should upgrade user role when admin is authenticated", async () => {
      const upgradeData = {
        userId: userId,
        role: UserRole.ARTIST,
      };

      const response = await request(app)
        .post("/v1/auth/user/upgrade")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(upgradeData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("role", UserRole.ARTIST);
    });

    it("should return 403 when non-admin tries to upgrade", async () => {
      const upgradeData = {
        userId: userId,
        role: UserRole.ADMIN,
      };

      const response = await request(app)
        .post("/v1/auth/user/upgrade")
        .set("Authorization", `Bearer ${userToken}`)
        .send(upgradeData);

      expect(response.status).toBe(403);
      expect(response.body.status).toBe("error");
    });

    it("should return 404 for non-existent user", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const upgradeData = {
        userId: nonExistentId,
        role: UserRole.ARTIST,
      };

      const response = await request(app)
        .post("/v1/auth/user/upgrade")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(upgradeData);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe("error");
    });
  });
});
