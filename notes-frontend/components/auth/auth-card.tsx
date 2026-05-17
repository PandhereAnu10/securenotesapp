"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authApi, getErrorMessage } from "@/lib/api";
import { GitHubIcon } from "@/components/icons/oauth-icons";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";

export function AuthCard() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [terminalError, setTerminalError] = useState<string | null>(null);

  const handleGoogleSuccess = async (credential: string) => {
    setGoogleLoading(true);
    setTerminalError(null);
    try {
      await authApi.googleLogin(credential);
      toast.success("Signed in with Google", {
        description: "Redirecting to your notes…",
      });
      router.push("/dashboard");
    } catch (err) {
      const message = getErrorMessage(err);
      setTerminalError(message);
      toast.error("Google sign-in failed", { description: message });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTerminalError(null);

    try {
      if (mode === "register") {
        await authApi.register(email, password);
        await authApi.login(email, password);
        toast.success("Account created", {
          description: "Redirecting to your notes…",
        });
      } else {
        await authApi.login(email, password);
        toast.success("Signed in", {
          description: "Welcome back.",
        });
      }
      router.push("/dashboard");
    } catch (err) {
      const message = getErrorMessage(err);
      setTerminalError(message);
      toast.error("Sign-in failed", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-obsidian-border bg-obsidian-panel shadow-2xl">
      <CardHeader className="space-y-3 border-b border-obsidian-border pb-8">
        <p className="text-sm font-medium text-zinc-400">Secure Notes</p>
        <CardTitle className="text-3xl font-semibold tracking-tight">
          {mode === "login" ? "Sign in" : "Create account"}
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Write, share, and restore notes when you need to.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-8">
        {/* <div className="grid grid-cols-2 gap-0 border border-obsidian-border">
          {googleClientId ? (
            <GoogleSignInButton
              loading={googleLoading}
              onSuccess={(credential) => void handleGoogleSuccess(credential)}
              onError={() =>
                toast.error("Google sign-in failed", {
                  description: "Could not complete Google authentication.",
                })
              }
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled
              className="h-11 rounded-none border-0 border-r border-obsidian-border bg-black text-zinc-500"
            >
              Google (set client ID)
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            disabled
            className="relative h-11 rounded-none border-0 bg-black text-zinc-500"
          >
            <GitHubIcon className="mr-2 h-4 w-4 opacity-50" />
            GitHub
            <Badge
              variant="outline"
              className="absolute right-2 top-2 border-zinc-600 px-1.5 py-0 text-[10px] font-medium normal-case tracking-normal text-zinc-400"
            >
              Upcoming
            </Badge>
          </Button>
        </div> */}

        {/* <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-obsidian-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-obsidian-panel px-3 text-xs font-medium text-zinc-500">
              or email
            </span>
          </div>
        </div> */}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-500">Email</label>
            <Input
              type="email"
              placeholder="you@firm.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || googleLoading}
              className="h-11 border-obsidian-border bg-black focus-visible:ring-zinc-600"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-500">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={loading || googleLoading}
              className="h-11 border-obsidian-border bg-black focus-visible:ring-zinc-600"
            />
          </div>

          {terminalError && (
            <pre className="overflow-x-auto border border-destructive/50 bg-black px-3 py-2 text-xs leading-relaxed text-red-400">
              {terminalError}
            </pre>
          )}

          <Button
            type="submit"
            disabled={loading || googleLoading}
            className="h-11 w-full rounded-none bg-foreground text-background hover:bg-foreground/90"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {mode === "login" ? "Signing in…" : "Creating account…"}
              </>
            ) : mode === "login" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setTerminalError(null);
            }}
            className="text-foreground underline-offset-4 hover:underline"
          >
            {mode === "login" ? "Create account" : "Sign in"}
          </button>
        </p>
      </CardContent>
    </Card>
  );
}
