"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Button, Card, Input } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function SignupPage() {
  const { session, loading, signup } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    pin: "",
    confirmPin: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) router.replace("/home");
  }, [session, loading, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.pin !== form.confirmPin) {
      setError("PINs don't match.");
      return;
    }
    setSubmitting(true);
    const result = await signup({
      username: form.username,
      pin: form.pin,
      displayName: form.displayName,
      role: "admin",
    });
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
            Create your account
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Your parties and games are saved to your account and sync across
            devices.
          </p>
        </div>

        <Card>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              label="Username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="ginny"
              hint="3–20 characters: letters, numbers, or underscore."
              required
            />
            <Input
              label="Display name"
              name="displayName"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="Ginny"
            />
            <Input
              label="PIN"
              name="pin"
              type="password"
              autoComplete="new-password"
              value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value })}
              placeholder="At least 4 characters"
              required
            />
            <Input
              label="Confirm PIN"
              name="confirmPin"
              type="password"
              autoComplete="new-password"
              value={form.confirmPin}
              onChange={(e) => setForm({ ...form, confirmPin: e.target.value })}
              placeholder="Re-enter your PIN"
              error={error ?? undefined}
              required
            />
            <p className="rounded-xl bg-background p-3 text-sm text-text-muted">
              Your account is yours to run. Create parties, build games, and
              invite others with a join code. You can add co-hosts to help run a
              live party.
            </p>
            <Button type="submit" size="lg" loading={submitting}>
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
