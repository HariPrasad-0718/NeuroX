import sql from "mssql";

// Azure SQL Database connection config from environment variables
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true, // required for Azure SQL
    trustServerCertificate: false,
  },
};

// Reusable connection pool (singleton)
let pool = null;

export async function getPool() {
  if (pool) return pool;

  try {
    pool = await sql.connect(dbConfig);
    console.log("Connected to Azure SQL Database");
    return pool;
  } catch (error) {
    console.error("Database connection failed:", error.message);
    throw error;
  }
}

export { sql };
