"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

const MINIMUM_PASSWORD_LENGTH = 8;

function getResponseMessage(payload: unknown, key: "error" | "message") {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const value = (payload as Record<string, unknown>)[key];

  return typeof value === "string" ? value : null;
}

export function AccountPasswordForm() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(formData: FormData) {
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < MINIMUM_PASSWORD_LENGTH) {
      setError(
        `New password must be at least ${MINIMUM_PASSWORD_LENGTH} characters.`,
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/account/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        setError(
          getResponseMessage(result, "error") ??
            "Unable to change your password.",
        );
        return;
      }

      setSuccess(
        getResponseMessage(result, "message") ??
          "Password changed successfully. Sign in again to continue.",
      );

      await signOut({ redirect: false });
      window.location.assign("/login?passwordChanged=1");
    } catch {
      setError("Unable to change your password. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-8 border-t border-[var(--brand-border)] pt-7">
      <p className="brand-eyebrow">Account Security</p>
      <h2 className="mt-2 text-2xl font-black">Change Password</h2>
      <p className="mt-2 text-sm leading-6 text-[#6b5a50]">
        Enter your current password and choose a new password with at least 8
        characters. You will sign in again after the change.
      </p>

      <form action={handleSubmit} className="mt-6 space-y-5">
        <label className="block text-sm font-bold">
          Current password
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            className="mt-2 w-full rounded-lg border border-[var(--brand-border)] px-4 py-3 outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
          />
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block text-sm font-bold">
            New password
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={MINIMUM_PASSWORD_LENGTH}
              required
              className="mt-2 w-full rounded-lg border border-[var(--brand-border)] px-4 py-3 outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
            />
          </label>

          <label className="block text-sm font-bold">
            Confirm new password
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={MINIMUM_PASSWORD_LENGTH}
              required
              className="mt-2 w-full rounded-lg border border-[var(--brand-border)] px-4 py-3 outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="text-sm font-semibold text-emerald-700">
            {success}
          </p>
        )}

        <button
          disabled={saving}
          className="brand-button-primary px-5 py-3 disabled:bg-neutral-400 disabled:text-neutral-700 disabled:shadow-none"
        >
          {saving ? "Changing Password..." : "Change Password"}
        </button>
      </form>
    </section>
  );
}
