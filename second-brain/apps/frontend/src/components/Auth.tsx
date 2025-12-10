"use client";

import React, { useState } from "react";

type Props = {
  onRegister: (email: string, password: string) => Promise<void>;
  onLogin: (email: string, password: string) => Promise<void>;
  loading?: boolean;
};

function PasswordRules() {
  return (
    <ul className="text-xs text-slate-300 ml-4 list-disc">
      <li>At least 8 characters</li>
      <li>Lowercase & uppercase letters</li>
      <li>Number</li>
      <li>Special character (!@#$%^&*)</li>
    </ul>
  );
}

export default function Auth({ onRegister, onLogin, loading = false }: Props) {
  const [tab, setTab] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // password pattern
  const pwdPattern = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}/;

  function showTemp(m: string, t: "err" | "ok" = "err") {
    if (t === "err") setErr(m);
    else setMsg(m);
    setTimeout(() => {
      setErr(null);
      setMsg(null);
    }, 4000);
  }

  async function handleRegister() {
    setErr(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return showTemp("Enter a valid email");
    if (!pwdPattern.test(password)) return showTemp("Password does not match required pattern");
    if (password !== confirm) return showTemp("Passwords do not match");
    try {
      await onRegister(email, password);
      showTemp("Registration successful — please login", "ok");
      setTab("login");
      setPassword("");
      setConfirm("");
    } catch (e: any) {
      showTemp(String(e?.message || e || "Register failed"));
    }
  }

  async function handleLogin() {
    setErr(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return showTemp("Enter a valid email");
    if (!password) return showTemp("Enter your password");
    try {
      await onLogin(email, password);
      showTemp("Logged in", "ok");
    } catch (e: any) {
      showTemp(String(e?.message || e || "Login failed"));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-800 p-6">
      <div className="w-full max-w-md bg-gradient-to-br from-indigo-700 to-purple-700 rounded-2xl shadow-2xl p-6 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-bold text-xl">SB</div>
          <div>
            <div className="text-xl font-semibold">Second Brain</div>
            <div className="text-xs text-white/80">Personal memory assistant</div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setTab("register"); setErr(null); setMsg(null); }}
            className={`flex-1 py-2 rounded ${tab === "register" ? "bg-white text-indigo-800 font-semibold" : "bg-white/10"}`}
          >
            Create account
          </button>
          <button
            onClick={() => { setTab("login"); setErr(null); setMsg(null); }}
            className={`flex-1 py-2 rounded ${tab === "login" ? "bg-white text-indigo-800 font-semibold" : "bg-white/10"}`}
          >
            Login
          </button>
        </div>

        <div className="bg-white/6 p-4 rounded mb-4">
          <label className="text-xs text-white/80">Email</label>
          <input
            className="w-full mt-1 p-2 rounded bg-transparent border border-white/20 text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="username"
          />

          <label className="text-xs text-white/80 mt-3 block">Password</label>
          <input
            className="w-full mt-1 p-2 rounded bg-transparent border border-white/20 text-white"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={tab === "login" ? "current-password" : "new-password"}
          />

          {tab === "register" && (
            <>
              <label className="text-xs text-white/80 mt-3 block">Confirm password</label>
              <input
                className="w-full mt-1 p-2 rounded bg-transparent border border-white/20 text-white"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
              />
              <div className="mt-3">
                <PasswordRules />
              </div>
            </>
          )}
        </div>

        {err && <div className="bg-rose-600 text-white p-2 rounded mb-3 text-sm">{err}</div>}
        {msg && <div className="bg-emerald-600 text-white p-2 rounded mb-3 text-sm">{msg}</div>}

        <div className="flex gap-2">
          {tab === "register" ? (
            <button
              onClick={handleRegister}
              disabled={loading}
              className="flex-1 py-2 rounded bg-white text-indigo-800 font-semibold hover:opacity-95"
            >
              {loading ? "Creating..." : "Create account"}
            </button>
          ) : (
            <button
              onClick={handleLogin}
              disabled={loading}
              className="flex-1 py-2 rounded bg-white text-indigo-800 font-semibold hover:opacity-95"
            >
              {loading ? "Logging..." : "Login"}
            </button>
          )}
        </div>

        {tab === "login" && (
          <div className="mt-3 text-xs text-white/80 flex justify-between items-center">
            <div>Forgot password?</div>
            <div className="text-xs italic">Tip: OTP is logged to backend console in local dev</div>
          </div>
        )}
      </div>
    </div>
  );
}
