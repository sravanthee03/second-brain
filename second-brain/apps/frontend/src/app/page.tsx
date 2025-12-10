// apps/frontend/src/app/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";

const backend = "http://localhost:4000";

/* ---------- small UI helpers ---------- */
function UserAvatar({ initials = "U" }: { initials?: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white text-sm font-semibold shadow-md">
      {initials}
    </div>
  );
}
function AssistantAvatar() {
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center text-white text-sm font-bold shadow-inner border border-white/6">
      AI
    </div>
  );
}

/* ---------- safe client-read helpers (avoid SSR mismatch) ---------- */
function readTokenFromStorage() {
  try {
    return typeof window !== "undefined" ? sessionStorage.getItem("sb_token") : null;
  } catch {
    return null;
  }
}
function readUserFromStorage() {
  try {
    return typeof window !== "undefined" ? sessionStorage.getItem("sb_user") : null;
  } catch {
    return null;
  }
}

/* ---------- helper: highlight query tokens in a text -> React nodes ---------- */
function highlightText(text: string, query: string | null) {
  if (!query) return <>{text}</>;

  const tokens = query
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return <>{text}</>;

  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = tokens.map(esc).join("|");
  const re = new RegExp(`(${pattern})`, "gi");

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const idx = m.index;
    if (idx > lastIndex) {
      parts.push(text.slice(lastIndex, idx));
    }
    parts.push(
      <mark key={`${idx}-${m[0]}`} className="bg-amber-300 text-black rounded px-0.5">
        {m[0]}
      </mark>
    );
    lastIndex = idx + m[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return <>{parts}</>;
}

/* ---------- main page component ---------- */
export default function Page() {
  const [mounted, setMounted] = useState(false);

  // auth form state (kept for future uses; Sidebar in your repo may handle auth on its own)
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  // global app state
  const [token, setToken] = useState<string | null>(null);
  const [memories, setMemories] = useState<any[]>([]);
  const [newMemory, setNewMemory] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // validation UI
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  // main view: "chat" or "memories"
  const [mainView, setMainView] = useState<"chat" | "memories">("chat");

  // keep a ref to help auto-scroll chat when new messages arrive
  const messagesEnd = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const t = readTokenFromStorage();
    const u = readUserFromStorage();
    if (t) setToken(t);
    if (u) fetchMemories(u);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // scroll chat area to bottom when chat updates
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, isTyping]);

  /* ---------- helpers ---------- */
  function getUserIdForHeader() {
    return readUserFromStorage() || "";
  }

  function validateAuthFields() {
    let ok = true;
    setEmailError(null);
    setPassError(null);

    if (!email.trim()) {
      setEmailError("Email is required");
      ok = false;
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      setEmailError("Enter a valid email");
      ok = false;
    }

    if (!pass) {
      setPassError("Password is required");
      ok = false;
    } else if (pass.length < 6) {
      setPassError("Password must be ≥ 6 characters");
      ok = false;
    }

    return ok;
  }

  async function showTemporary(message: string, type: "error" | "success" = "error", ms = 3500) {
    if (type === "error") {
      setAuthError(message);
      setTimeout(() => setAuthError(null), ms);
    } else {
      setAuthSuccess(message);
      setTimeout(() => setAuthSuccess(null), ms);
    }
  }

  /* ---------- AUTH (lightweight helpers kept if you want to expose) ---------- */
  async function register() {
    if (!validateAuthFields()) {
      showTemporary("Fix form errors first", "error");
      return;
    }
    setLoadingAuth(true);
    try {
      const res = await fetch(`${backend}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: pass }),
      });
      const j = await res.json();
      if (res.ok && j.token) {
        sessionStorage.setItem("sb_token", j.token);
        sessionStorage.setItem("sb_user", email.trim());
        setToken(j.token);
        await fetchMemories(email.trim());
        setPass("");
        showTemporary("Registered successfully", "success");
      } else {
        showTemporary("Register failed: " + (j?.error || JSON.stringify(j)), "error");
      }
    } catch (e: any) {
      showTemporary("Network error: " + String(e.message || e), "error");
    } finally {
      setLoadingAuth(false);
    }
  }

  async function login() {
    if (!validateAuthFields()) {
      showTemporary("Fix form errors first", "error");
      return;
    }
    setLoadingAuth(true);
    try {
      const res = await fetch(`${backend}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: pass }),
      });
      const j = await res.json();
      if (res.ok && j.token) {
        sessionStorage.setItem("sb_token", j.token);
        sessionStorage.setItem("sb_user", email.trim());
        setToken(j.token);
        await fetchMemories(email.trim());
        setPass("");
        showTemporary("Logged in", "success");
      } else {
        showTemporary("Login failed: " + (j?.error || JSON.stringify(j)), "error");
      }
    } catch (e: any) {
      showTemporary("Network error: " + String(e.message || e), "error");
    } finally {
      setLoadingAuth(false);
    }
  }

  function logout() {
    sessionStorage.removeItem("sb_token");
    sessionStorage.removeItem("sb_user");
    setToken(null);
    setMemories([]);
    setChat([]);
    showTemporary("Logged out", "success");
  }

  /* ---------- memories ---------- */
  async function addMemory() {
    const userId = getUserIdForHeader();
    if (!userId) return showTemporary("Please login first", "error");
    if (!newMemory.trim()) return showTemporary("Memory cannot be empty", "error");

    try {
      const res = await fetch(`${backend}/api/memories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
          "x-user-id": userId,
        },
        body: JSON.stringify({ title: "note", fullText: newMemory.trim() }),
      });
      const j = await res.json();
      if (res.ok && j.memory) {
        setNewMemory("");
        fetchMemories();
        showTemporary("Memory saved", "success");
      } else {
        showTemporary("Failed to save: " + JSON.stringify(j), "error");
      }
    } catch (e: any) {
      showTemporary("Network error: " + String(e.message || e), "error");
    }
  }

  async function fetchMemories(tknOrUser?: string) {
    const userHeader = tknOrUser || getUserIdForHeader();
    if (!userHeader) return;
    try {
      const res = await fetch(`${backend}/api/memories`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "x-user-id": userHeader,
        },
      });
      const j = await res.json();
      setMemories(j.memories || []);
    } catch (e) {
      console.error("fetchMemories error", e);
    }
  }

  /* ---------- chat ---------- */
  async function sendMessage() {
    const userId = getUserIdForHeader();
    if (!userId) return showTemporary("Login first", "error");
    if (!message.trim()) return;

    const q = message.trim();
    if (q.length <= 1) {
      return showTemporary("Type at least 2 characters.", "error");
    }

    const userMsg = { role: "user", text: message };
    setChat((c) => [...c, userMsg]);
    setMessage("");
    setIsTyping(true);

    try {
      const res = await fetch(`${backend}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
          "x-user-id": userId,
        },
        body: JSON.stringify({ message: userMsg.text }),
      });
      const j = await res.json();
      await new Promise((r) => setTimeout(r, 300));
      const assistantMsg = { role: "assistant", text: j.reply || "No reply", used: j.used || [] };
      setIsTyping(false);
      setChat((c) => [...c, assistantMsg]);
      // switch to chat view when a message is sent
      setMainView("chat");
    } catch (e) {
      setIsTyping(false);
      setChat((c) => [...c, { role: "assistant", text: "Error contacting server." }]);
    }
  }

  /* ---------- helper to find the query for a given assistant message index ---------- */
  function inferQueryForAssistantMessageIndex(idx: number) {
    const prev = chat[idx - 1];
    if (prev && prev.role === "user" && typeof prev.text === "string" && prev.text.trim().length > 0) {
      return prev.text;
    }
    const assistant = chat[idx];
    if (assistant && typeof assistant.text === "string") {
      const m = assistant.text.match(/"([^"]+)"/);
      if (m) return m[1];
    }
    return null;
  }

  /* ---------- UI rendering ---------- */
  return (
    <div className="h-screen w-full flex bg-gradient-to-br from-slate-950 via-black to-slate-900 text-slate-100">
      {/* Sidebar - keep it fixed, no page-level scroll */}
      <aside className="w-80 h-full border-r border-white/8 bg-gradient-to-b from-black/60 to-transparent p-6 flex flex-col" style={{ minWidth: 320 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">SB</div>
          <div>
            <div className="text-lg font-semibold">Second Brain</div>
            <div className="text-xs text-slate-400">Your memory assistant</div>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs text-slate-400 mb-2 block">Session token</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/5 border border-white/8 rounded px-3 py-2 text-xs break-all">{token ? `${token.slice(0, 32)}...` : "Not logged"}</div>
            <button
              onClick={() => { if (token) navigator.clipboard?.writeText(token); }}
              className="px-3 py-2 rounded bg-white/6 hover:bg-white/10 text-xs"
            >
              Copy
            </button>
          </div>
        </div>

        {/* view toggles */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setMainView("chat")}
            className={`flex-1 px-4 py-2 rounded ${mainView === "chat" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-white/10 hover:bg-white/20"}`}
          >
            Chat
          </button>
          <button
            onClick={() => setMainView("memories")}
            className={`flex-1 px-4 py-2 rounded ${mainView === "memories" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-white/10 hover:bg-white/20"}`}
          >
            Memories
          </button>
        </div>

        {/* Logout button / spacer at bottom */}
        <div className="mt-auto">
          <button onClick={logout} className="w-full px-4 py-3 rounded bg-red-600 hover:bg-red-700 text-white">Logout</button>
        </div>
      </aside>

      {/* Main column */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/6 bg-black/20 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{mainView === "chat" ? "Chat" : "Memories"}</h3>
            <p className="text-sm text-slate-400">{mainView === "chat" ? "Ask your assistant — it will search your memories." : "Your saved memories"}</p>
          </div>
          <div className="text-xs text-slate-400">Premium UI • Local demo</div>
        </div>

        {/* Content area (this scrolls ONLY) */}
        <div className="flex-1 overflow-auto p-6" style={{ /* ensure the content area is the only scroller */ }}>
          {mainView === "memories" ? (
            <>
              <div className="space-y-6">
                {memories.length === 0 ? (
                  <div className="text-slate-400">No memories yet — save one using the box below.</div>
                ) : (
                  memories.map((m) => (
                    <div key={m.id} className="p-4 bg-white/5 rounded border border-white/10">
                      <div className="font-medium text-sm">{m.title || "note"}</div>
                      <div className="text-sm text-slate-200 mt-2 whitespace-pre-wrap">{m.fullText}</div>
                      <div className="text-xs text-slate-400 mt-2">{m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}</div>
                    </div>
                  ))
                )}
              </div>

              {/* spacer so content doesn't get hidden behind footer box */}
              <div style={{ height: 160 }} />
            </>
          ) : (
            <>
              <div className="space-y-4">
                {chat.map((m, idx) => (
                  <div key={idx} className={`max-w-3xl flex ${m.role === "user" ? "ml-auto justify-end" : "mr-auto justify-start"}`}>
                    {m.role === "assistant" && <AssistantAvatar />}
                    <div className={`mx-3 p-3 rounded-2xl shadow ${m.role === "user" ? "bg-gradient-to-br from-indigo-600 to-blue-500 text-white rounded-br-none" : "bg-white/10 text-slate-100 rounded-bl-none border border-white/6"}`}>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</div>

                      {m.role === "assistant" && m.used?.length > 0 && (
                        <details className="mt-3 text-xs text-slate-300">
                          <summary className="cursor-pointer">Used memories ({m.used.length})</summary>
                          <div className="mt-2 space-y-2">
                            {m.used.map((u: any, i: number) => {
                              const mem = memories.find((mm) => mm.id === u.memoryId || mm.id === u.id);
                              const q = inferQueryForAssistantMessageIndex(idx);
                              return (
                                <div key={i} className="p-3 bg-black/40 rounded border border-white/6 text-xs">
                                  <div className="font-medium text-[13px] mb-1">{mem?.title || "note"}</div>
                                  {mem ? (
                                    <div className="text-[13px] text-slate-200 whitespace-pre-wrap">
                                      {highlightText(mem.fullText || "", q)}
                                    </div>
                                  ) : (
                                    <div className="font-mono truncate">{u.memoryId || u.id}</div>
                                  )}
                                  {mounted && u?.score != null && <div className="text-slate-400 text-[11px] mt-2">score: {Number(u.score).toFixed(4)}</div>}
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      )}
                    </div>
                    {m.role === "user" && <UserAvatar initials="U" />}
                  </div>
                ))}
                {isTyping && (
                  <div className="flex items-center space-x-3">
                    <AssistantAvatar />
                    <div className="p-3 rounded-2xl bg-white/6 text-slate-200 animate-fadeIn">
                      <div className="typing-dots" />
                    </div>
                  </div>
                )}

                <div ref={messagesEnd} />
              </div>
            </>
          )}
        </div>

        {/* Footer bar — stays fixed at bottom of the main column (not inside the scroller) */}
        <div className="border-t border-white/6 bg-black/20 p-4">
          {mainView === "chat" ? (
            <div className="flex items-center gap-3">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type your message and press Enter"
                className="flex-1 p-3 rounded bg-white/5 border border-white/8"
              />
              <button onClick={() => sendMessage()} className="px-5 py-2 rounded bg-indigo-600 hover:bg-indigo-700">Send</button>
            </div>
          ) : (
            <div>
              
              <div className="flex gap-3 items-start">
                <textarea
                  value={newMemory}
                  onChange={(e) => setNewMemory(e.target.value)}
                  placeholder="Write something to remember..."
                  className="flex-1 p-3 rounded bg-white/5 border border-white/8 h-28 resize-none"
                />
                <div className="flex flex-col gap-3">
                  <button onClick={addMemory} className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white">Save</button>
                  <button onClick={() => fetchMemories()} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">Refresh</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
