"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import "primeflex/primeflex.css";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import MatrixView from "@/components/dashboard/MatrixView";

function MatrixFullPage() {
  const searchParams = useSearchParams();
  return (
    <MatrixView initialProfile={searchParams.get("profile") ?? ""} fullPage />
  );
}

export default function MatrixFullPageRoute() {
  return (
    <Suspense>
      <MatrixFullPage />
    </Suspense>
  );
}
