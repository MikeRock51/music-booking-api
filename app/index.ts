import dotenv from 'dotenv';
import { initializeDatabase, closeDatabase } from "./config/database";
import { createApp } from "./createApp";

dotenv.config();

const app = createApp();
const port = 3000;

initializeDatabase();

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Worker: ${process.pid}`);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(async () => {
    console.log("HTTP server closed");
    await closeDatabase();
    console.log("Database connection closed");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT signal received: closing HTTP server");
  server.close(async () => {
    console.log("HTTP server closed");
    await closeDatabase();
    console.log("Database connection closed");
    process.exit(0);
  });
});

export default app;
