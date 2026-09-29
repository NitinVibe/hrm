import { useState } from "react";
import type { FormEvent } from "react";
import { Lock, Mail, LogIn } from "lucide-react";
import { login } from "../api/auth";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = await login(email, password);

      localStorage.setItem("access_token", data.access_token);

      if (data.refresh_token) {
        localStorage.setItem(
          "refresh_token",
          data.refresh_token,
        );
      }

      onLogin();
    } catch (err: any) {
  console.error("LOGIN ERROR:", err);

  const detail = err?.response?.data?.detail;

  if (detail) {
    setError(String(detail));
  } else if (err?.response) {
    setError(
      `Login failed (${err.response.status}). Check the backend.`,
    );
  } else {
    setError(
      "Cannot connect to HRM backend. Make sure FastAPI is running on port 8000.",
    );
  }
} finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">

      <div className="hidden w-1/2 bg-indigo-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">

        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg font-bold text-indigo-600">
              H
            </div>

            <span className="text-xl font-bold">
              HRM System
            </span>
          </div>

          <div className="mt-32 max-w-lg">
            <h1 className="text-5xl font-bold leading-tight">
              Manage your people.
              <br />
              Grow your organization.
            </h1>

            <p className="mt-6 text-lg text-indigo-100">
              Employees, attendance, leave, shifts and HR
              operations — all in one place.
            </p>
          </div>
        </div>

        <p className="text-sm text-indigo-200">
          Human Resource Management Platform
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">

        <div className="w-full max-w-md">

          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
                H
              </div>

              <span className="text-xl font-bold">
                HRM System
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900">
                Welcome back
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Sign in to your HRM account.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="admin@example.com"
                    required
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Password
                </label>

                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="••••••••"
                    required
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogIn size={18} />

                {loading ? "Signing in..." : "Sign In"}
              </button>

            </form>

          </div>

        </div>
      </div>
    </div>
  );
}