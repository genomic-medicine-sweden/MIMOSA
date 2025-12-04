"use client";

import { useState, useEffect } from "react";

export default function useCurrentUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      } catch (err) {
        console.error(
          "[useCurrentUser] Failed to parse user from localStorage:",
          err,
        );
      }
    }
  }, []);

  return user;
}
