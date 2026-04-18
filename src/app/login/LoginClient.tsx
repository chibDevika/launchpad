"use client";

import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-card bg-primary text-white text-xl font-bold">
            L
          </div>
          <h1 className="text-3xl font-bold text-text-primary">Launchpad</h1>
          <p className="text-text-secondary text-lg">
            Your calm corner of the job hunt.
          </p>
        </div>

        <div className="card p-6 text-left space-y-3">
          {[
            "Tailored resumes in under a minute",
            "Honest match scores — no fluff",
            "Cover letters that don't sound like cover letters",
          ].map((line) => (
            <div key={line} className="flex items-start gap-3">
              <span className="text-accent mt-0.5">✓</span>
              <span className="text-text-secondary text-sm">{line}</span>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-surface border border-slate-200 text-text-primary font-medium py-3 px-6 rounded-input hover:bg-slate-50 transition-colors shadow-sm"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {error && (
            <p className="text-sm text-red-500">
              Something went wrong. Give it another go.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

export default function LoginClient() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
