"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Menu as MenuIcon, X } from "lucide-react";
import { Kavoon } from "next/font/google";
import { auth } from "../../../config/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

const kavoon = Kavoon({ subsets: ["latin"], weight: "400" });

const Menu = () => {
  const [isOpen, setIsOpen] = useState(false); // Variable to set and change whether hamburger menu is toggled.
  const [user, setUser] = useState(null); // Variable to set and change user state.
  const [userDropdownOpen, setUserDropdownOpen] = useState(false); // Variable to toggle user dropdown

  useEffect(() => {
    // Checks if a user is logged in
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        console.log("Logged in as:", firebaseUser.displayName);
      } else {
        console.log("No user signed in");
      }
    });

    return () => unsubscribe();
  }, []);

  // Close mobile menu if screen is resized to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(false); // close mobile menu on desktop
        setUserDropdownOpen(false); // also close user dropdown
      }
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUserDropdownOpen(false);
  };

  return (
    <div className="flex justify-end gap-3 relative">
      {/* Desktop Menu */}
      <nav className="hidden md:flex w-full gap-1">
        <Button asChild variant="ghost">
          <Link
            href="/about"
            className="text-[#564930] hover:!text-[#C89E4D] hover:bg-transparent text-xl"
          >
            About
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link
            href="/grow"
            className="text-[#564930] hover:!text-[#C89E4D] hover:bg-transparent text-xl"
          >
            Grow
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link
            href="/portfolio"
            className="text-[#564930] hover:!text-[#C89E4D] hover:bg-transparent text-xl"
          >
            Portfolio
          </Link>
        </Button>
        {/* <Button asChild variant="ghost">
          <Link
            href="/community"
            className="text-[#564930] hover:!text-[#C89E4D] hover:bg-transparent text-xl"
          >
            Community
          </Link>
        </Button> */}

        {/* User Button */}
        <div className="inline-block relative">
          {" "}
          {/* <- inline-block to fit button width */}
          <Button
            asChild
            className="bg-[#564930] hover:bg-[#C89E4D] text-white font-bold rounded-full"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
          >
            {user ? (
              <span
                className="block text-center"
                style={{ fontSize: "clamp(12px, 1rem, 1.5rem)" }}
              >
                {user.displayName}
              </span>
            ) : (
              <Link href="/auth" className="text-xl">
                Login
              </Link>
            )}
          </Button>
          {/* Dropdown */}
          {userDropdownOpen && user && (
            <div className="absolute top-full left-0 mt-1 bg-white shadow-lg rounded-lg w-full z-50">
              <button
                className="w-full text-left px-4 py-2 text-[#564930] hover:bg-[#C89E4D] hover:text-white rounded-lg"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Hamburger */}
      <button
        className="md:hidden p-2 text-[#564930]"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={28} /> : <MenuIcon size={28} />}
      </button>

      {/* Mobile Dropdown */}
      {isOpen && (
        <div className="absolute top-12 right-0 bg-white shadow-lg rounded-xl flex flex-col p-4 w-48 z-50">
          <Link
            href="/about"
            className="py-2 text-[#564930] hover:text-[#C89E4D]"
            onClick={() => setIsOpen(false)}
          >
            About
          </Link>
          <Link
            href="/grow"
            className="py-2 text-[#564930] hover:text-[#C89E4D]"
            onClick={() => setIsOpen(false)}
          >
            Grow
          </Link>
          <Link
            href="/portfolio"
            className="py-2 text-[#564930] hover:text-[#C89E4D]"
            onClick={() => setIsOpen(false)}
          >
            Portfolio
          </Link>
          <Link
            href="/community"
            className="py-2 text-[#564930] hover:text-[#C89E4D]"
            onClick={() => setIsOpen(false)}
          >
            Community
          </Link>

          {/* Mobile User Button */}
          <div className="inline-block relative mt-2">
            <Button
              asChild
              className="bg-[#564930] text-white text-center rounded-full py-2 hover:bg-[#C89E4D] w-full"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            >
              {user ? (
                <span
                  className="block w-full text-center"
                  style={{ fontSize: "clamp(12px, 1rem, 1.5rem)" }}
                >
                  {user.displayName}
                </span>
              ) : (
                <Link href="/auth" onClick={() => setIsOpen(false)}>
                  Login
                </Link>
              )}
            </Button>

            {/* Mobile Dropdown */}
            {userDropdownOpen && user && (
              <div className="absolute top-full left-0 mt-1 bg-white shadow-lg rounded-lg w-full z-50">
                <button
                  className="w-full text-left px-4 py-2 text-[#564930] hover:bg-[#C89E4D] hover:text-white rounded-lg"
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false); // close mobile menu after logout
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;
