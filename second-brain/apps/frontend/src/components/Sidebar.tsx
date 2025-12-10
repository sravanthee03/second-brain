"use client";

import React, { useState } from "react";

export type Memory = {
  id: string;
  title?: string;
  fullText?: string;
  createdAt?: string;
};

type Props = {
  email?: string;
  pass?: string;
  onEmailChange?: (v: string) => void;
  onPassChange?: (v: string) => void;
  onRegister?: () => Promise<void> | void;
  onLogin?: () => Promise<void> | void;
  onLogout: () => void;
  tokenPreview?: string | null;
  newMemory: string;
  onNewMemoryChange: (v: string) => void;
  onSaveMemory: () => Promise<void> | void;
  onRefreshMemories: () => Promise<void> | void;
  memories: Memory[];
  loadingAuth?: boolean;
  emailError?: string | null;
  passError?: string | null;

  // <-- ADD THIS prop to switch main view
  setMainView: (v: "chat" | "memories") => void;
};

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.12" />
      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function Sidebar({
  onLogout,
  tokenPreview,
  newMemory,
  onNewMemoryChange,
  onSaveMemory,
  onRefreshMemories,
  memories,
  loadingAuth = false,
  emailError,
  passError,
  setMainView,
}: Props) {
  const [showPass, setShowPass] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  function copyToken() {
    if (!tokenPreview) return;
    try {
      navigator.clipboard.writeText(tokenPreview);
    } catch {
      // ignore
    }
  }

  // local wrappers in case parent provided heavy async handlers
  async function handleSwitchToChat() {
    try {
      setRegisterLoading(false);
      setLoginLoading(false);
      setMainView("chat");
    } catch {
      /* no-op */
    }
  }
  async function handleSwitchToMemories() {
    try {
      setRegisterLoading(false);
      setLoginLoading(false);
      setMainView("memories");
    } catch {
      /* no-op */
    }
  }

  return (
    <aside className="w-80 h-screen overflow-y-auto border-r border-white/8 bg-gradient-to-b from-black/60 to-transparent p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">SB</div>
          <div>
            <div className="text-lg font-semibold">Second Brain</div>
            <div className="text-xs text-slate-400">Your memory assistant</div>
          </div>
        </div>
        <div className="text-xs text-slate-400">Local demo</div>
      </div>

      {/* Token preview */}
      <div className="mb-5">
        <label className="text-xs text-slate-400 mb-1 block">Session token</label>
        <div className="flex items-center gap-2">
          <div className="flex-1 text-xs break-all bg-white/3 border border-white/8 rounded px-3 py-2 text-slate-200">
            {tokenPreview ? `${tokenPreview.slice(0, 28)}...` : "Not logged"}
          </div>
          <button
            type="button"
            onClick={copyToken}
            className="px-3 py-2 rounded bg-white/6 hover:bg-white/10 transition text-xs"
            title="Copy token"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Simple nav tabs */}
      <div className="flex gap-3 mb-4">
        <button
          type="button"
          onClick={handleSwitchToChat}
          className="flex-1 px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition"
        >
          Chat
        </button>
        <button
          type="button"
          onClick={handleSwitchToMemories}
          className="flex-1 px-3 py-2 rounded bg-white/10 hover:bg-white/20 transition"
        >
          Memories
        </button>
      </div>

      

      

      <div className="mt-6">
        <button onClick={onLogout} className="w-full px-3 py-2 rounded bg-red-600 hover:bg-red-700 text-white transition">
          Logout
        </button>
      </div>
    </aside>
  );
}
