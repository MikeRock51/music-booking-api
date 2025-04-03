import mongoose from "mongoose";
import "dotenv/config";

const environment = process.env.NODE_ENV;
const isTest = environment === "test";
const DB_URI = isTest ? process.env.TEST_DB_URI : process.env.DB_URI;

export async function initializeDatabase() {
  try {
    await mongoose.connect(DB_URI as string);
    console.log(`Connected to ${environment} database successfully! ✅✅✅`);
  } catch (err) {
    console.error("❌❌❌ Unable to connect to the database:", err);
    console.log(`DB URI: ${DB_URI}`);
    process.exit(1);
  }
}

export async function closeDatabase() {
  try {
    await mongoose.connection.close();
    console.log("Database connection closed successfully! ✅✅✅");
  } catch (err) {
    console.error("❌❌❌ Error while closing the database connection:", err);
  }
}