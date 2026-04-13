"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/apiFetch";

export default function useOutbreakRules() {
  const [rules, setRules] = useState(null);

  useEffect(() => {
    apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/outbreaks/rules`)
      .then((res) => res.json())
      .then(setRules)
      .catch((err) => console.error("Failed to fetch outbreak rules:", err));
  }, []);

  return rules;
}
