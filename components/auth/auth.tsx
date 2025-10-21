"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, EyeOff, Eye } from "lucide-react";

import { auth, googleProvider } from "../../config/firebase";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";

export const Auth = () => {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // If already signed in, redirect
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) router.replace("/home");
    });
    return unsub;
  }, [router]);

  // Email/password login
  const login = async () => {
    setErr(null);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/home");
    } catch (e: unknown) {
      const message =
        e instanceof FirebaseError
          ? (() => {
              switch (e.code) {
                case "auth/invalid-credential":
                case "auth/wrong-password":
                  return "Invalid email or password.";
                case "auth/user-not-found":
                  return "No account with that email.";
                default:
                  return "Login failed. Please try again.";
              }
            })()
          : "Login failed. Please try again.";
      setErr(message);
    } finally {
      setBusy(false);
    }
  };

  // Google login
  const signInWithGoogle = async () => {
    setErr(null);
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
      router.replace("/home");
    } catch (error: unknown) {
      const message =
        error instanceof FirebaseError
          ? error.message || "Google sign-in failed. Please try again."
          : "Login failed. Please try again.";
      setErr(message);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void login();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-yellow-50 to-green-100 relative">
      {/* Back to home */}
      <div className="absolute top-6 left-6 z-10">
        <Link
          href="/"
          className="flex items-center space-x-2 text-amber-700 hover:text-amber-800 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to home</span>
        </Link>
      </div>

      {/* Main */}
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md">
          {/* Logo & Heading */}
          <div className="text-center mb-8">
            <div className="relative w-40 h-20 mx-auto mb-4">
              <Image
                src="/images/Logo.png"
                alt="image logo"
                fill
                className="object-cover"
                sizes="10vw"
                priority
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Welcome back
            </h1>
            <p className="text-gray-600">
              Sign in to continue your fungal journey
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-xl shadow-xl p-8 border border-amber-100">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {err && (
                <p className="text-sm text-red-600" role="alert">
                  {err}
                </p>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3 mt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-amber-700 text-white py-3 px-4 rounded-lg hover:bg-amber-800 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 font-medium transition-colors disabled:opacity-70"
                >
                  {busy ? "Signing in..." : "Sign in"}
                </button>

                <button
                  type="button"
                  onClick={signInWithGoogle}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-4 py-2 bg-white hover:bg-gray-50 transition disabled:opacity-70"
                >
                  <Image
                    src="https://www.svgrepo.com/show/355037/google.svg"
                    alt="Google logo"
                    width={20}
                    height={20}
                  />
                  <span className="text-gray-700 font-medium">
                    Sign in with Google
                  </span>
                </button>
              </div>
            </form>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Don&apos;t have an account?{" "}
                <Link
                  href="/sign-up"
                  className="text-amber-700 hover:text-amber-800 font-medium"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Join our community of mushroom enthusiasts and help protect fungal
              biodiversity
            </p>
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-20 text-center py-4">
        <p className="text-sm text-gray-700">
          Shining a light on the vibrant mycelium networks that sustain our
          world
        </p>
      </div>
    </div>
  );
};
