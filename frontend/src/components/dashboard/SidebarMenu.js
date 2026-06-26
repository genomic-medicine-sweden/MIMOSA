"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "primereact/button";
import { useViewMode, ViewModes } from "./ViewModeContext";
import { useRouter } from "next/navigation";
import useCurrentUser from "@/hooks/useCurrentUser";

export default function SidebarMenu() {
  const { setViewMode } = useViewMode();
  const router = useRouter();

  const user = useCurrentUser();
  const role = user?.role;

  const handleLogout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      localStorage.removeItem("user");
      router.push("/");
    } catch (err) {
      console.error("[Logout] Failed to logout:", err);
    }
  };

  return (
    <nav className="flex flex-column h-full">
      <div className="flex flex-column gap-3">
        <Button
          label="Dashboard"
          icon="pi pi-chart-line"
          className="w-full justify-start"
          text
          onClick={() => setViewMode(ViewModes.OVERVIEW)}
        />

        <Button
          label="My County"
          icon="pi pi-map-marker"
          className="w-full justify-start"
          text
          onClick={() => setViewMode(ViewModes.MY_COUNTY)}
        />

        <Button
          label="Notifications"
          icon="pi pi-bell"
          className="w-full justify-start"
          text
          onClick={() => setViewMode(ViewModes.NOTIFICATIONS)}
        />
        <Button
          label="Matrix"
          icon="pi pi-th-large"
          className="w-full justify-start"
          text
          onClick={() => setViewMode(ViewModes.MATRIX)}
        />
        <Button
          label="Tree"
          icon="pi pi-sitemap"
          className="w-full justify-start"
          text
          onClick={() => setViewMode(ViewModes.TREE)}
        />
        <Button
          label="Timeline"
          icon="pi pi-calendar"
          className="w-full justify-start"
          text
          onClick={() => setViewMode(ViewModes.TIMELINE)}
        />
        <Button
          label="Reports"
          icon="pi pi-file-pdf"
          className="w-full justify-start"
          text
          onClick={() => setViewMode(ViewModes.REPORTS)}
        />

        {role === "admin" && (
          <Button
            label="Logs"
            icon="pi pi-book"
            className="w-full justify-start"
            text
            onClick={() => setViewMode(ViewModes.LOGS)}
          />
        )}

        {role === "admin" && (
          <Button
            label="Samples"
            icon="pi pi-database"
            className="w-full justify-start"
            text
            onClick={() => setViewMode(ViewModes.SAMPLES)}
          />
        )}
        {role === "admin" && (
          <Button
            label="Pending Samples"
            icon="pi pi-clock"
            className="w-full justify-start"
            text
            onClick={() => setViewMode(ViewModes.PENDING_SAMPLES)}
          />
        )}
        <Button
          label="Settings"
          icon="pi pi-cog"
          className="w-full justify-start"
          text
          onClick={() => setViewMode(ViewModes.SETTINGS)}
        />
        {role === "admin" && (
          <Button
            label="Admin"
            icon="pi pi-shield"
            className="w-full justify-start"
            text
            onClick={() => setViewMode(ViewModes.ADMIN)}
          />
        )}
      </div>

      <div className="mt-auto mb-2">
        <Button
          label="Logout"
          icon="pi pi-sign-out"
          className="w-full justify-start text-red-600 text-lg py-2"
          text
          onClick={handleLogout}
        />
      </div>
    </nav>
  );
}
