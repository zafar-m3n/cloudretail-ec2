import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, authLoading, authError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [localError, setLocalError] = useState(null);

  // If already logged in, redirect away from login page
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/products", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !password.trim()) {
      setLocalError("Please enter your email and password.");
      return;
    }

    const result = await login(email.trim(), password);

    if (result.success) {
      // Redirect to originally requested page (if any), else products
      const from = location.state?.from || "/products";
      navigate(from, { replace: true });
    } else if (result.message) {
      setLocalError(result.message);
    } else {
      setLocalError("Login failed. Please try again.");
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white px-8 py-10 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:login" className="h-7 w-7 text-blue-600" />
            <h1 className="text-xl font-semibold tracking-wide text-gray-800">Sign in to CloudRetail</h1>
          </div>
          <p className="text-sm text-gray-500">Access your profile, cart, and orders.</p>
        </div>

        {/* Error Messages */}
        {(localError || authError) && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {localError || authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              Email address
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Icon icon="mdi:email-outline" className="h-4 w-4 text-gray-400" />
              </span>
              <input
                id="email"
                type="email"
                className="block w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Icon icon="mdi:lock-outline" className="h-4 w-4 text-gray-400" />
              </span>
              <input
                id="password"
                type="password"
                className="block w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Submit Button with inline spinner */}
          <button
            type="submit"
            disabled={authLoading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {authLoading ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Signing you in...
              </>
            ) : (
              <>
                <Icon icon="mdi:login" className="h-4 w-4" />
                Sign in
              </>
            )}
          </button>
        </form>

        {/* Footer links */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>
            Don&apos;t have an account?{" "}
            <Link to="/register" className="font-medium text-blue-600 hover:underline">
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
