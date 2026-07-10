"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function SignInCard() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";

  return (
    <Card className="w-full max-w-sm items-center gap-6 p-8 text-center shadow-2xl">
      <div className="flex flex-col items-center gap-3">
        <span className="grid size-12 place-items-center rounded-xl text-2xl font-extrabold text-white [background:var(--grad)]">
          £
        </span>
        <div>
          <h1 className="text-xl font-bold">Spending Tracker</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Sign in to see your banks, balances and spending in one place.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => signIn("google", { callbackUrl })}
      >
        <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
          />
          <path
            fill="#FBBC05"
            d="M5.85 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.67-2.84Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.39 14.97.36 12 .36A11 11 0 0 0 2.18 7.06l3.67 2.84C6.71 6.68 9.14 4.75 12 4.75Z"
          />
        </svg>
        Continue with Google
      </Button>
      <p className="text-muted-foreground text-xs">
        We only use your Google account to identify you. Your bank data stays
        private to your account.
      </p>
    </Card>
  );
}

export default function SignInPage() {
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <Suspense>
        <SignInCard />
      </Suspense>
    </div>
  );
}
