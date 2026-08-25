const express = require("express");
const cors = require("cors");
const path = require("path");
const { initSchema, seedDefaultData } = require("./src/db");
const { hashPassword } = require("./src/security");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const facultyRoutes = require("./routes/faculty");
const attendanceRoutes = require("./routes/attendance");

const app = express();
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || "127.0.0.1";

// 1. Initialize SQLite Database & Seed Default Accounts
initSchema();
seedDefaultData(hashPassword);

// 2. Middlewares
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.originalUrl !== "/health") {
      console.log(`[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// 3. Health & Root Endpoints
app.get("/", (req, res) => {
  res.json({
    system: "Smart Attendance Management API",
    status: "online",
    version: "2.0.0",
    institution: "Acharya Institute of Technology",
    engine: "Node.js & Express.js",
    database: "SQLite (smart_attendance.db)",
    ml_models: "YuNet 2023Mar + SFace 2021Dec ONNX",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    database: "connected",
    timestamp: new Date().toISOString(),
  });
});

// 4. Mount API Routers
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/attendance", attendanceRoutes);

// 5. 404 Handler
app.use((req, res) => {
  res.status(404).json({ detail: `Endpoint not found: ${req.method} ${req.originalUrl}` });
});

// 6. Global Error Handler
app.use((err, req, res, next) => {
  console.error("[API Error]", err);
  res.status(err.status || 500).json({
    detail: err.message || "Internal Server Error",
  });
});

// 7. Start Server (if executed directly)
if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log("=================================================");
    console.log(`🚀 Smart Attendance Node.js & Express API Server`);
    console.log(`📡 URL: http://${HOST}:${PORT}`);
    console.log(`📊 Health Check: http://${HOST}:${PORT}/health`);
    console.log(`💾 Database: SQLite (smart_attendance.db)`);
    console.log(`🤖 ML Models: YuNet + SFace ONNX Active`);
    console.log("=================================================");
  });
}

module.exports = app;
