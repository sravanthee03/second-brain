import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = Router();
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const USERS_FILE = path.join(dataDir, "users.json");
function readUsers(): any[] {
  try {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8") || "[]");
  } catch (e) {
    console.error("readUsers error", e);
    return [];
  }
}
function writeUsers(u: any[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(u, null, 2), "utf8");
}

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const TOKEN_EXP = "7d"; // adjust for prod

// small OTP store for local dev (not persistent, simple)
const otpStore: Record<string, { otp: string; expiresAt: number }> = {};

// helper: generate jwt
function createToken(email: string) {
  return jwt.sign({ email }, JWT_SECRET, { expiresIn: TOKEN_EXP });
}

/**
 * POST /api/auth/register
 * Body: { email, password }
 */
router.post("/register", async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  // basic password pattern: lower, upper, digit, special, min8
  const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
  if (!pwdRegex.test(password)) {
    return res.status(400).json({ error: "password must have lower, upper, digit, special and be 8+ chars" });
  }

  const users = readUsers();
  if (users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: "account already exists" });
  }

  const hashed = await bcrypt.hash(password, 10);
  const newUser = {
    id: (Math.random().toString(16).slice(2) + Date.now().toString(16)),
    email,
    passwordHash: hashed,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  writeUsers(users);

  // Optionally auto-login: create token and return
  const token = createToken(email);
  return res.json({ token, message: "registered" });
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  const users = readUsers();
  const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(401).json({ error: "invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash || "");
  if (!ok) return res.status(401).json({ error: "invalid credentials" });

  const token = createToken(email);
  return res.json({ token, message: "logged in" });
});

/**
 * POST /api/auth/forgot
 * Body: { email }
 * - Logs OTP to console (local dev) — replace with email sending in prod
 */
router.post("/forgot", (req: Request, res: Response) => {
  const email = (req.body?.email || "").toString();
  if (!email) return res.status(400).json({ error: "email required" });

  const users = readUsers();
  if (!users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
    // for security we can return success even if not found - but frontend expects feedback
    return res.status(404).json({ error: "account not found" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email.toLowerCase()] = { otp, expiresAt: Date.now() + 1000 * 60 * 10 }; // 10m
  console.log(`[OTP] ${email} -> ${otp} (local dev log; send via email in prod)`);
  return res.json({ message: "otp_sent" });
});

/**
 * POST /api/auth/reset
 * Body: { email, otp, newPassword }
 */
router.post("/reset", async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body || {};
  if (!email || !otp || !newPassword) return res.status(400).json({ error: "email, otp, newPassword required" });

  const record = otpStore[email.toLowerCase()];
  if (!record || record.expiresAt < Date.now() || record.otp !== otp) {
    return res.status(400).json({ error: "invalid otp" });
  }

  // same password policy
  const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
  if (!pwdRegex.test(newPassword)) {
    return res.status(400).json({ error: "password must have lower, upper, digit, special and be 8+ chars" });
  }

  const users = readUsers();
  const idx = users.findIndex((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (idx === -1) return res.status(404).json({ error: "account not found" });

  users[idx].passwordHash = await bcrypt.hash(newPassword, 10);
  writeUsers(users);

  delete otpStore[email.toLowerCase()];
  return res.json({ message: "password_reset" });
});

export default router;
