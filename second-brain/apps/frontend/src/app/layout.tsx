// apps/frontend/src/app/layout.tsx
import "../styles/globals.css";
import React from "react";

export const metadata = {
  title: "Second Brain - Demo",
  description: "LLM memory assistant demo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Load Tailwind from CDN for dev — this makes styles immediate and reliable */}
        <script src="https://cdn.tailwindcss.com"></script>

        {/* small Tailwind config extension (optional colors) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                theme: {
                  extend: {
                    colors: {
                      brand: '#2563eb',
                      panel: '#0f1720'
                    }
                  }
                }
              }
            `,
          }}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="antialiased bg-gradient-to-b from-slate-900 via-black to-slate-900 text-slate-100">
        {children}
      </body>
    </html>
  );
}
