"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type LoginFormProps = {
  passwordChanged: boolean;
};

export function LoginForm({ passwordChanged }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setError("");

    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
      callbackUrl: "/account",
    });

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push("/account");
    router.refresh();
  }

  return (
    <main className="brand-page px-6 py-12">
      <div className="brand-card mx-auto max-w-md p-8">
        <p className="brand-eyebrow">Welcome Back</p>
        <h1 className="mt-2 text-3xl font-black">Sign In</h1>

        {passwordChanged && (
          <p
            role="status"
            className="mt-5 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
          >
            Password changed successfully. Sign in with your new password.
          </p>
        )}

        <form action={handleSubmit} className="mt-8 space-y-5">
          <label className="block text-sm font-bold">
            Email
            <input
              name="email"
              type="email"
              placeholder="Email"
              className="mt-2 w-full rounded-lg border border-[var(--brand-border)] px-4 py-3 outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
              required
            />
          </label>

          <label className="block text-sm font-bold">
            Password
            <input
              name="password"
              type="password"
              placeholder="Password"
              className="mt-2 w-full rounded-lg border border-[var(--brand-border)] px-4 py-3 outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
              required
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button className="brand-button-primary w-full px-5 py-3">
            Sign In
          </button>
        </form>

        <p className="mt-5 text-sm text-[#6b5a50]">
          Need an account?{" "}
          <Link href="/register" className="font-bold text-[#9f2f18]">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
