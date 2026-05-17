"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthCard } from "@/components/auth/auth-card";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";

export default function LoginPage() {
  const content = (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-obsidian-bg px-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(#1f1f1f 1px, transparent 1px), linear-gradient(90deg, #1f1f1f 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative z-10 w-full max-w-md">
        <AuthCard />
      </div>
      <p className="relative z-10 mt-12 text-ui-caption">
        Encrypted · Audited · Swiss-grade
      </p>
    </div>
  );

  if (!googleClientId) {
    return content;
  }

  return <GoogleOAuthProvider clientId={googleClientId}>{content}</GoogleOAuthProvider>;
}
