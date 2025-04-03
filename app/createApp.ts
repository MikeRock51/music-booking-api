import express from "express";
import router from "./routes";
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';

dotenv.config();

export function createApp() {
    const app = express();

    // Apply global middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Add Helmet middleware for security headers
    app.use(helmet());

    // Configure CORS
    app.use(cors({
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Apply rate limiting to all requests
    app.use(apiLimiter);

    app.use(router);
    app.use(errorHandler);

    return app;
}