"use client";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/config/firebase";

export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const onClick = async () => {
    await signOut(auth);
    router.replace("/auth"); // your login route
  };
  return (
    <button onClick={onClick} className={className}>
      Logout
    </button>
  );
}
