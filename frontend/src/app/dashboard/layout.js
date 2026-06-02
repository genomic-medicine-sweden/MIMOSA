"use client";

import { useEffect } from "react";
import "primeflex/primeflex.css";
import SidebarMenu from "@/components/dashboard/SidebarMenu";
import { ViewModeProvider } from "@/components/dashboard/ViewModeContext";
import { MapConfigContext } from "@/components/MapConfigContext";
import useMapConfig from "@/hooks/useMapConfig";
import { initCoordinates } from "@/utils/coordinates";

export default function DashboardLayout({ children }) {
  const { mapConfig } = useMapConfig();

  useEffect(() => {
    if (!mapConfig) return;
    initCoordinates(
      mapConfig.postcodeCoordinates,
      mapConfig.hospitalCoordinates,
      mapConfig.postcodePrefix,
      mapConfig.postcodeLength,
    );
  }, [mapConfig]);

  return (
    <MapConfigContext.Provider value={mapConfig}>
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
    </MapConfigContext.Provider>
  );
}
