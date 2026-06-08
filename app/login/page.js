"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const [role, setRole] = useState("designer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      setError("Please provide a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.login({
        email: email.trim().toLowerCase(),
        password,
        role,
      });

      if (response?.success && response?.data?.userId) {
        router.push("/dashboard");
        return;
      }

      setError(response?.error?.message || "Login failed");
    } catch (err) {
      setError(err.message.includes("401") ? "Invalid email or password" : err.message.includes("403") ? "Selected role does not match your account" : "Unable to login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="absolute -bottom-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-sky-100/60 blur-3xl" />
      </div>

      <div className="relative mx-auto grid w-full max-w-5xl items-stretch overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.12)] lg:grid-cols-[1.05fr_1fr]">
        <section className="hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-10 text-white lg:flex lg:flex-col">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100">NeuroX Platform</p>
          <h1 className="mt-5 text-4xl font-bold leading-tight">Accelerate Innovation Through Agentic Design Thinking.</h1>
        </section>

        <section className="p-6 sm:p-8 md:p-10">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Welcome Back</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Sign in to Neurox</h2>
            <p className="mt-2 text-sm text-slate-600">Continue to your workspace and active project pipeline.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                placeholder="Your password"
                autoComplete="current-password"
                required
              />
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-slate-700">Choose your role</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("designer")}
                  className={`rounded-xl border px-4 py-4 text-left transition ${
                    role === "designer"
                      ? "border-indigo-500 bg-indigo-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className={`block text-sm font-semibold ${role === "designer" ? "text-indigo-700" : "text-slate-800"}`}>
                    Designer
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">Create and manage project outputs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("manager")}
                  className={`rounded-xl border px-4 py-4 text-left transition ${
                    role === "manager"
                      ? "border-indigo-500 bg-indigo-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className={`block text-sm font-semibold ${role === "manager" ? "text-indigo-700" : "text-slate-800"}`}>
                    Manager
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">Oversee teams, clients, and outcomes</span>
                </button>
              </div>
            </div>

            {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Signing in..." : `Continue as ${role === "manager" ? "Manager" : "Designer"}`}
            </button>

            <p className="text-center text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-semibold text-indigo-600 hover:text-indigo-700">
                Sign up
              </Link>
            </p>
          </form>
        </section>
      </div>

      <p className="relative mt-6 text-center text-xs text-slate-500">© 2024 Neurox. All rights reserved.</p>
    </div>
  );
}
