import request from 'supertest';
import { createApp } from '../app/createApp';
import { initializeDatabase, closeDatabase } from '../app/config/database';
import mongoose from 'mongoose';

describe('Test App', () => {
    beforeAll(async () => {
        await initializeDatabase();
    });

    it('should return 200 OK', async () => {
        const app = createApp();
        const response = await request(app).get('/');
        expect(response.status).toBe(200);
    });

    it('should connect to the database', async () => {
        const client = await initializeDatabase();
        const res = await mongoose.connection.db?.admin().ping();
        expect(res).toBeTruthy();
    });

    afterAll(async () => {
        await closeDatabase();
    });
});
