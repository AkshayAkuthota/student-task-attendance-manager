require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  console.warn("Set DATABASE_URL and JWT_SECRET in backend/.env before running.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost")
    ? { rejectUnauthorized: false } : false
});

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json({ limit: "10kb" }));

const validText = (v, max) => typeof v === "string" && v.trim().length > 0 && v.trim().length <= max;
function validDate(v) {
  if (v === "" || v == null) return true;
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
function authenticate(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Please log in first." });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Session expired. Please log in again." });
  }
}

app.get("/", (_req, res) => res.json({ message: "Student Task & Attendance Manager API is running" }));

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (!validText(name, 100) || !validText(email, 255) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        typeof password !== "string" || password.length < 8 || password.length > 72) {
      return res.status(400).json({ message: "Enter a valid name/email and a password of 8–72 characters." });
    }
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO users (name,email,password_hash) VALUES ($1,LOWER($2),$3) RETURNING id,name,email",
      [name.trim(), email.trim(), hash]
    );
    res.status(201).json({ message: "Registration successful. You can now log in.", user: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "This email is already registered." });
    next(err);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }
    const result = await pool.query(
      "SELECT id,name,email,password_hash FROM users WHERE email=LOWER($1)",
      [email.trim()]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "2h" });
    res.json({ message: "Login successful", token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) { next(err); }
});

app.use("/api/tasks", authenticate);
app.use("/api/attendance", authenticate);

app.get("/api/tasks", async (req, res, next) => {
  try {
    const { status, sort = "asc", search = "" } = req.query;
    if (status && !["Pending", "Completed"].includes(status))
      return res.status(400).json({ message: "Status must be Pending or Completed." });
    if (!["asc", "desc"].includes(sort))
      return res.status(400).json({ message: "Sort must be asc or desc." });
    if (typeof search !== "string" || search.length > 100)
      return res.status(400).json({ message: "Search text is too long." });
    const values = [req.user.id];
    let sql = `SELECT id,title,subject,due_date AS "dueDate",status
               FROM tasks WHERE user_id=$1`;
    if (status) { values.push(status); sql += ` AND status=$${values.length}`; }
    if (search.trim()) {
      values.push(`%${search.trim()}%`);
      sql += ` AND (title ILIKE $${values.length} OR subject ILIKE $${values.length})`;
    }
    sql += ` ORDER BY due_date ${sort === "asc" ? "ASC" : "DESC"} NULLS LAST,id ASC`;
    res.json((await pool.query(sql, values)).rows);
  } catch (err) { next(err); }
});

app.post("/api/tasks", async (req, res, next) => {
  try {
    const { title, subject, dueDate = "" } = req.body || {};
    if (!validText(title, 200) || !validText(subject, 100) || !validDate(dueDate))
      return res.status(400).json({ message: "Enter a valid title, subject and due date." });
    const result = await pool.query(
      `INSERT INTO tasks(user_id,title,subject,due_date) VALUES($1,$2,$3,$4)
       RETURNING id,title,subject,due_date AS "dueDate",status`,
      [req.user.id, title.trim(), subject.trim(), dueDate || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

app.put("/api/tasks/:id", async (req, res, next) => {
  try {
    if (!/^[1-9]\d*$/.test(req.params.id))
      return res.status(400).json({ message: "Invalid task ID." });
    const { status } = req.body || {};
    if (!["Pending", "Completed"].includes(status))
      return res.status(400).json({ message: "Status must be Pending or Completed." });
    const result = await pool.query(
      `UPDATE tasks SET status=$1 WHERE id=$2 AND user_id=$3
       RETURNING id,title,subject,due_date AS "dueDate",status`,
      [status, Number(req.params.id), req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Task not found." });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

app.delete("/api/tasks/:id", async (req, res, next) => {
  try {
    if (!/^[1-9]\d*$/.test(req.params.id))
      return res.status(400).json({ message: "Invalid task ID." });
    const result = await pool.query(
      "DELETE FROM tasks WHERE id=$1 AND user_id=$2 RETURNING id",
      [Number(req.params.id), req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Task not found." });
    res.json({ message: "Task deleted successfully." });
  } catch (err) { next(err); }
});

app.get("/api/attendance", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id,subject,present,total,
       CASE WHEN total=0 THEN 0 ELSE ROUND(present*100.0/total,2) END AS percentage,
       CASE WHEN total=0 THEN 'No classes recorded'
            WHEN present*100.0/total < 75 THEN 'Low attendance'
            ELSE 'Attendance satisfactory' END AS alert
       FROM attendance WHERE user_id=$1 ORDER BY subject`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

app.post("/api/attendance", async (req, res, next) => {
  try {
    const { subject, present, total } = req.body || {};
    if (!validText(subject, 100) || !Number.isSafeInteger(present) ||
        !Number.isSafeInteger(total) || present < 0 || total < 0 || present > total)
      return res.status(400).json({ message: "Enter a valid subject and attendance counts (present cannot exceed total)." });
    const result = await pool.query(
      `INSERT INTO attendance(user_id,subject,present,total) VALUES($1,$2,$3,$4)
       ON CONFLICT(user_id,subject) DO UPDATE SET present=EXCLUDED.present,total=EXCLUDED.total
       RETURNING id,subject,present,total`,
      [req.user.id, subject.trim(), present, total]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (res.headersSent) return;
  res.status(500).json({ message: "Unexpected server error. Please try again." });
});

const server = app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
async function shutdown() {
  server.close();
  await pool.end();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
