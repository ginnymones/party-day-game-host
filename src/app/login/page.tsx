"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Button, Card, Input } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const { session, loading, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) router.replace("/home");
  }, [session, loading, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await login(username, pin);
    setSubmitting(false);
    if (result.ok) {
      router.replace("/home");
    } else {
      setError(result.error);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div
            aria-hidden="true"
            className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-button text-2xl text-button-foreground shadow-card"
          >
            🎉
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Party Day Game Host
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Sign in with your username and PIN to get the party going.
          </p>
        </div>

        <Card>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              label="Username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="gamemaster"
              required
            />
            <Input
              label="PIN"
              name="pin"
              type="password"
              inputMode="text"
              autoComplete="current-password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Your PIN"
              error={error ?? undefined}
              required
            />
            <Button type="submit" size="lg" loading={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-sm text-text-muted">
          New here?{" "}
          <Link href="/signup" className="font-medium text-accent hover:underline">
            Create an account
          </Link>
        </p>

        <details className="mt-4 rounded-xl border border-card-border bg-card/60 p-3 text-sm text-text-muted">
          <summary className="cursor-pointer font-medium text-text-primary">
            Demo accounts
          </summary>
          <ul className="mt-2 space-y-1">
            <li>Game Master — <code>gamemaster</code> / <code>banana</code></li>
            <li>Participant — <code>participant</code> / <code>bababa</code></li>
            <li>Audience — <code>audience</code> / <code>123456</code></li>
            <li>Admin — <code>admin</code> / <code>246810</code></li>
          </ul>
        </details>
      </div>
    </main>
  );
}
