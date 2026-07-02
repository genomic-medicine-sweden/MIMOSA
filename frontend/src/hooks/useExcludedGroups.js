"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/utils/apiFetch";

export default function useExcludedGroups() {
  const [excludedGroups, setExcludedGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  const fetchExcludedGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${apiBase}/api/excluded-groups`);
      if (res?.ok) {
        const data = await res.json();
        setExcludedGroups(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExcludedGroups();
  }, [fetchExcludedGroups]);

  const createExcludedGroup = useCallback(
    async (dto) => {
      const res = await apiFetch(`${apiBase}/api/excluded-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      });
      if (res?.ok) await fetchExcludedGroups();
      return res;
    },
    [fetchExcludedGroups],
  );

  const deleteExcludedGroup = useCallback(
    async (id) => {
      const res = await apiFetch(`${apiBase}/api/excluded-groups/${id}`, {
        method: "DELETE",
      });
      if (res?.ok) await fetchExcludedGroups();
      return res;
    },
    [fetchExcludedGroups],
  );

  return {
    excludedGroups,
    loading,
    createExcludedGroup,
    deleteExcludedGroup,
    refresh: fetchExcludedGroups,
  };
}
