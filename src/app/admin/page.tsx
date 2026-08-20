"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useRequireAuth } from "@/components/AuthProvider";
import { AppHeader } from "@/components/AppHeader";
import { Button, Card, Input, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { db } from "@/lib/db";
import {
  ROLE_LABELS,
  createUser,
  deleteUser,
  updateUserPin,
} from "@/lib/auth";
import type { Role } from "@/lib/types";

const ROLES: Role[] = ["gamemaster", "participant", "audience", "admin"];

export default function AdminPage() {
  const { session, loading, authorized } = useRequireAuth(["admin"]);
  const { toast } = useToast();

  const users = useLiveQuery(
    () => db.users.orderBy("username").toArray(),
    []
  );

  const [form, setForm] = useState({
    username: "",
    displayName: "",
    pin: "",
    role: "participant" as Role,
  });
  const [creating, setCreating] = useState(false);

  if (loading || !authorized) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background">
        <Spinner className="h-6 w-6" />
      </main>
    );
  }

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const result = await createUser(form);
    setCreating(false);
    if (result.ok) {
      toast(`Created "${result.user.username}"`, "success");
      setForm({ username: "", displayName: "", pin: "", role: "participant" });
    } else {
      toast(result.error, "error");
    }
  };

  const onResetPin = async (userId: string, username: string) => {
    const pin = prompt(`Enter a new PIN for "${username}" (min 4 characters):`);
    if (!pin) return;
    if (pin.length < 4) {
      toast("PIN must be at least 4 characters.", "error");
      return;
    }
    await updateUserPin(userId, pin);
    toast("PIN updated", "success");
  };

  const onDelete = async (userId: string, username: string) => {
    if (userId === session?.userId) {
      toast("You can't delete the account you're signed into.", "error");
      return;
    }
    if (!confirm(`Delete user "${username}"?`)) return;
    await deleteUser(userId);
    toast("User deleted", "info");
  };

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader title="Admin" />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Card>
          <h1 className="text-lg font-semibold text-text-primary">Add a user</h1>
          <p className="mt-1 text-sm text-text-muted">
            Create accounts for hosts, participants, and audience members.
          </p>
          <form onSubmit={onCreate} className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input
              label="Username"
              value={form.username}
              autoCapitalize="none"
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="jordan"
            />
            <Input
              label="Display name"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="Jordan Lee"
            />
            <Input
              label="PIN"
              type="password"
              value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value })}
              placeholder="At least 4 characters"
            />
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="role"
                className="text-sm font-medium text-text-primary"
              >
                Role
              </label>
              <select
                id="role"
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as Role })
                }
                className="h-11 rounded-xl border border-card-border bg-card px-3 text-text-primary focus:outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" loading={creating}>
                Create user
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold text-text-primary">Users</h2>
          {users === undefined ? (
            <Spinner className="h-5 w-5" />
          ) : (
            <ul className="divide-y divide-card-border">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary">
                      {u.displayName}{" "}
                      <span className="font-normal text-text-muted">
                        @{u.username}
                      </span>
                    </p>
                    <p className="text-xs text-text-muted">
                      {ROLE_LABELS[u.role]}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onResetPin(u.id, u.username)}
                    >
                      Reset PIN
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(u.id, u.username)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
}
