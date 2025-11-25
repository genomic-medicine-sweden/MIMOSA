"use client";

import "primeflex/primeflex.css";
import SidebarMenu from "@/components/dashboard/SidebarMenu";
import { ViewModeProvider } from "@/components/dashboard/ViewModeContext";

export default function DashboardLayout({ children }) {
  return (
    <ViewModeProvider>
      <div className="flex flex-column h-screen">
        <header className="bg-white border-bottom-1 surface-border py-3 px-4 text-center">
          <img
            src="/MIMOSA_simpletxt.svg"
            alt="MIMOSA Logo"
            className="mx-auto"
            style={{ height: "70px" }}
          />
        </header>

        <div className="flex flex-1 overflow-hidden">
          <aside className="bg-white border-right-1 surface-border p-3 min-w-[220px] h-full overflow-auto">
            <SidebarMenu />
          </aside>

          <main className="flex-1 p-4 text-color overflow-auto h-full">
            {children}
          </main>
        </div>
      </div>
    </ViewModeProvider>
  );
}
