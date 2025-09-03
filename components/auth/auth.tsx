"use client";

import { useState } from "react";
import { auth, googleProvider } from "../../config/firebase";
import { createUserWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, EyeOff, Eye } from "lucide-react";

export const Auth = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    
    console.log(auth?.currentUser?.email);

    const signUp = async() => {
        try {
        await createUserWithEmailAndPassword(auth, email, password);
        } catch (err) {
            console.error(err);
        }
    }

    const SignInWithGoogle = async() => {
        try {
        await signInWithPopup(auth, googleProvider);
        } catch (err) {
            console.error(err);
        }
    }

    const logout = async() => {
        try {
        await signOut(auth);
        } catch (err) {
            console.error(err);
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Login attempt:', { email, password, rememberMe });
      };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-100 via-yellow-50 to-green-100 relative">
      {/* Background Pattern (can change colour or insert image)*/}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"100\" height=\"100\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cdefs%3E%3Cpattern id=\"mushroom\" x=\"0\" y=\"0\" width=\"50\" height=\"50\" patternUnits=\"userSpaceOnUse\"%3E%3Ccircle cx=\"25\" cy=\"35\" r=\"8\" fill=\"%23f3e8ff\" opacity=\"0.3\"/%3E%3Cpath d=\"M20 35 Q25 25 30 35\" stroke=\"%23e5d3ff\" stroke-width=\"2\" fill=\"none\" opacity=\"0.3\"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\"100\" height=\"100\" fill=\"url(%23mushroom)\"/%3E%3C/svg%3E')"
        }}
      ></div>

      {/* Back to Home Link */}
      <div className="absolute top-6 left-6 z-10">
        <button className="flex items-center space-x-2 text-amber-700 hover:text-amber-800 font-medium transition-colors">
          <Link href="/" className="flex-start">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
          </Link>
        </button>
      </div>

      {/* Main Login Container */}
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md">
          {/* Logo */}
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
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome back</h1>
            <p className="text-gray-600">Sign in to continue your fungal journey</p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-xl shadow-xl p-8 border border-amber-100">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <div className="relative">
                    <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="Enter your email"
                    required
                    />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-sm text-amber-700 hover:text-amber-800 font-medium">
                  Forgot password?
                </a>
              </div> */}

              {/* Login Button */}
              <button
                type="submit"
                className="w-full bg-amber-700 text-white py-3 px-4 rounded-lg hover:bg-amber-800 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 font-medium transition-colors"
              >
                Sign in
              </button>

            {/* Login Button */}
              <button
                type="submit"
                className="w-full bg-amber-700 text-white py-3 px-4 rounded-lg hover:bg-amber-800 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 font-medium transition-colors"
              >
                Sign in with Google??
              </button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Don't have an account?{' '}
                <a href="#" className="text-amber-700 hover:text-amber-800 font-medium">
                  Sign up here
                </a>
              </p>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Join our community of mushroom enthusiasts and help protect fungal biodiversity
            </p>
          </div>
        </div>
      </div>

      {/* Footer Mission Statement */}
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-20 text-center py-4">
        <p className="text-sm text-gray-700">
          "Shining a light on the vibrant mycelium networks that sustain our world"
        </p>
      </div>
    </div>
  );
};

