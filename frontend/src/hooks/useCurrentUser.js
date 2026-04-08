"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function useCurrentUser() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (err) {
        console.error("[useCurrentUser] Failed to parse user:", err);
      }
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
        {
          credentials: "include",
        },
      );
      if (res.status === 401) {
        localStorage.removeItem("user");
        router.push("/login");
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [router]);

  return user;
}
