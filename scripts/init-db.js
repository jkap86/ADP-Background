import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import pkg from "pg";
const { Client } = pkg;
import { fileURLToPath } from "url";

dotenv.config({ path: process.cwd() + "/.env" });

const ssl =
  process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl,
});

async function initializeDatabase() {
  try {
    await client.connect();
    console.log("Connected to database");

    const migrations_directory = path.join(process.cwd(), "db", "migrations");

    const migrations_files = fs.readdirSync(migrations_directory);

    for (const migration_file of migrations_files.sort(
      (a, b) => b.includes("leagues") - a.includes("leagues")
    )) {
      if (migration_file.endsWith(".sql")) {
        const sql = fs.readFileSync(
          path.join(migrations_directory, migration_file),
          "utf8"
        );
        await client.query(sql);
      }
    }

    console.log("Database initialized");
  } catch (error) {
    console.error("Error connecting to database", error);
    process.exit(1);
  } finally {
    await client.end();
    console.log("Database connection closed");
  }
}

initializeDatabase();
