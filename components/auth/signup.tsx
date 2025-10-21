"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowLeft, Check } from "lucide-react";
import Image from "next/image";

// Firebase Auth wiring — make sure this path matches your project
import { auth } from "../../config/firebase";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  showConfirmPassword: boolean;
};

const SignUp: React.FC = () => {
  const router = useRouter();

  const [formData, setFormData] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    showPassword: false,
    showConfirmPassword: false,
  });

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // If already signed in, skip sign-up
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) router.replace("/auth");
    });
    return unsub;
  }, [router]);

  const handleInputChange = <Key extends keyof FormState>(
    field: Key,
    value: FormState[Key]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const passwordsMatch =
    !!formData.password &&
    !!formData.confirmPassword &&
    formData.password === formData.confirmPassword;
  const isPasswordStrong = formData.password.length >= 8;

  const validate = () => {
    if (!formData.firstName.trim()) return "Please enter your first name.";
    if (!formData.lastName.trim()) return "Please enter your last name.";
    if (!formData.email.trim()) return "Please enter your email address.";
    if (!isPasswordStrong) return "Password must be at least 8 characters.";
    if (!passwordsMatch) return "Passwords do not match.";
    return null;
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setErr(null);

    const v = validate();
    if (v) {
      setErr(v);
      return;
    }

    setBusy(true);
    try {
      // Persist login locally by default (auto sign-in next visit)
      await setPersistence(auth, browserLocalPersistence);

      // Create the account
      const cred = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Set display name as "First Last"
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
      if (cred.user && fullName) {
        await updateProfile(cred.user, { displayName: fullName });
      }

      // Redirect to dashboard (or change to "/check-email" if you prefer)
      router.replace("/home");
    } catch (e: unknown) {
      const message =
        e instanceof FirebaseError
          ? (() => {
              switch (e.code) {
                case "auth/email-already-in-use":
                  return "An account with this email already exists.";
                case "auth/invalid-email":
                  return "Please enter a valid email address.";
                case "auth/weak-password":
                  return "Password is too weak.";
                default:
                  return "Sign up failed. Please try again.";
              }
            })()
          : "Sign up failed. Please try again.";
      setErr(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-yellow-50 to-green-100 relative">
      {/* Back to Login Link */}
      <div className="absolute top-6 left-6 z-10">
        <Link
          href="/auth"
          className="flex items-center space-x-2 text-amber-700 hover:text-amber-800 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Login</span>
        </Link>
      </div>

      {/* Main Sign Up Container */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
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
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Join our community</h1>
            <p className="text-gray-600">Start your journey with fungal conservation</p>
          </div>

          {/* Sign Up Form */}
          <div className="bg-white rounded-xl shadow-xl p-8 border border-amber-100">
            {err && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
                {err}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit} noValidate>
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First name
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors outline-none bg-white"
                    placeholder="First Name"
                    disabled={busy}
                    required
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors outline-none bg-white"
                    placeholder="Last Name"
                    disabled={busy}
                    required
                    autoComplete="family-name"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors outline-none bg-white"
                  placeholder="email@example.com"
                  disabled={busy}
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={formData.showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors outline-none bg-white"
                    placeholder="Create a strong password"
                    disabled={busy}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => handleInputChange("showPassword", !formData.showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={formData.showPassword ? "Hide password" : "Show password"}
                  >
                    {formData.showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="mt-2">
                  <div className={`text-xs flex items-center ${isPasswordStrong ? "text-green-600" : "text-gray-500"}`}>
                    {isPasswordStrong && <Check className="w-3 h-3 mr-1" />}
                    At least 8 characters
                  </div>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    type={formData.showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-amber-500 transition-colors outline-none bg-white ${formData.confirmPassword && !passwordsMatch ? "border-red-300 focus:border-red-500" : "border-gray-300 focus:border-amber-500"}`}
                    placeholder="Confirm your password"
                    disabled={busy}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => handleInputChange("showConfirmPassword", !formData.showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={formData.showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {formData.showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {formData.confirmPassword && (
                  <div className="mt-2">
                    <div className={`text-xs flex items-center ${passwordsMatch ? "text-green-600" : "text-red-600"}`}>
                      {passwordsMatch && <Check className="w-3 h-3 mr-1" />}
                      {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                    </div>
                  </div>
                )}
              </div>

              {/* Sign Up Button */}
              <button
                type="submit"
                disabled={!passwordsMatch || !isPasswordStrong || busy}
                className="w-full bg-amber-700 text-white py-3 px-4 rounded-lg hover:bg-amber-800 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {busy ? "Creating account…" : "Create account"}
              </button>
            </form>

            {/* Sign In Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Already have an account?{" "}
                <Link href="/auth" className="text-amber-700 hover:text-amber-800 font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              By joining Myco Lab, you&apos;re helping protect fungal biodiversity worldwide.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Mission Statement */}
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-20 text-center py-4 z-0">
        <p className="text-sm text-gray-700">
          &ldquo;Shining a light on the vibrant mycelium networks that sustain our world&rdquo;
        </p>
      </div>
    </div>
  );
};

export default SignUp;
