"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "designer",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.name.trim() || !formData.email.trim() || !formData.password) {
      setError("All fields are required");
      return;
    }

    if (!EMAIL_REGEX.test(formData.email.trim())) {
      setError("Please provide a valid email address");
      return;
    }

    if (!PASSWORD_REGEX.test(formData.password)) {
      setError("Password must be 8+ chars with uppercase, lowercase, and number");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.signup({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
      });

      if (response?.success) {
        router.push("/login");
        return;
      }

      setError(response?.error?.message || "Signup failed");
    } catch (err) {
      setError(
        err.message.includes("409")
          ? "Email already exists"
          : "Unable to create account. Please try again."
      );
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100">Start With NeuroX</p>
          <h1 className="mt-5 text-4xl font-bold leading-tight">Accelerate Innovation Through Agentic Design Thinking.</h1>
        </section>

        <section className="p-6 sm:p-8 md:p-10">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Create Account</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Get started with Neurox</h2>
            <p className="mt-2 text-sm text-slate-600">Set up your profile to access your project workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onChange("name", e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                placeholder="Your full name"
                autoComplete="name"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => onChange("email", e.target.value)}
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
                value={formData.password}
                onChange={(e) => onChange("password", e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
              />
              <p className="text-xs text-slate-500">Use uppercase, lowercase, and a number</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Role</label>
              <select
                value={formData.role}
                onChange={(e) => onChange("role", e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              >
                <option value="designer">Designer</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </button>

            <p className="text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
                Sign in
              </Link>
            </p>
          </form>
        </section>
      </div>

      <p className="relative mt-6 text-center text-xs text-slate-500">© 2024 Neurox. All rights reserved.</p>
    </div>
  );
}
