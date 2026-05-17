"use client";

import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { Loader2 } from "lucide-react";

interface GoogleSignInButtonProps {
  loading?: boolean;
  onSuccess: (credential: string) => void;
  onError: () => void;
}

export function GoogleSignInButton({
  loading,
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  if (loading) {
    return (
      <div className="flex h-11 w-full items-center justify-center border-r border-obsidian-border bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="google-sign-in-wrap flex h-11 w-full min-w-0 items-center justify-center overflow-hidden border-r border-obsidian-border bg-black [&>div]:!flex [&>div]:!w-full [&_iframe]:!max-w-full">
      <GoogleLogin
        onSuccess={(response: CredentialResponse) => {
          if (response.credential) onSuccess(response.credential);
          else onError();
        }}
        onError={onError}
        theme="filled_black"
        size="large"
        width="180"
        text="continue_with"
        shape="rectangular"
      />
    </div>
  );
}
