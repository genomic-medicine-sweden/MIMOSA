"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/utils/apiFetch";

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL;
      const res = await apiFetch(`${apiBase}/api/notifications`);

      if (!res.ok)
        throw new Error(`Failed to fetch notifications (${res.status})`);
      const data = await res.json();
      setNotifications(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return { notifications, loading, error, refresh: fetchNotifications };
}
