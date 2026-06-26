"use client";
import { useState, useEffect } from "react";
import { apiFetch } from "@/utils/apiFetch";

export default function useCurrentUser() {
  const [user, setUser] = useState(null);

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
    const interval = setInterval(() => {
      apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return user;
}
