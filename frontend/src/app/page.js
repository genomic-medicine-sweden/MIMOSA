"use client";

import dynamic from "next/dynamic";
import { useViewMode, ViewModes } from "@/components/dashboard/ViewModeContext";
import useAppData from "@/hooks/useAppData";
import SampleOverviewCard from "@/components/dashboard/SampleOverviewCard";
import CountyCard from "@/components/dashboard/CountyCard";
import LogsCard from "@/components/dashboard/LogsCard";

const SettingsPage = dynamic(
  () => import("@/components/dashboard/SettingsPage"),
  { ssr: false },
);
const NotificationsPage = dynamic(
  () => import("@/components/dashboard/NotificationsPage"),
  { ssr: false },
);
const MyCountyView = dynamic(
  () => import("@/components/dashboard/MyCountyView"),
  { ssr: false },
);
const AdminPage = dynamic(() => import("@/components/dashboard/AdminPage"), {
  ssr: false,
});
const SamplesPage = dynamic(
  () => import("@/components/dashboard/SamplesPage"),
  { ssr: false },
);
const LogsPage = dynamic(() => import("@/components/dashboard/LogsPage"), {
  ssr: false,
});

const MatrixPage = dynamic(() => import("@/components/dashboard/MatrixPage"), {
  ssr: false,
});

export default function DashboardPage() {
  const { viewMode } = useViewMode();
  const { data } = useAppData();

  if (viewMode === ViewModes.MY_COUNTY) return <MyCountyView data={data} />;
  if (viewMode === ViewModes.SETTINGS) return <SettingsPage />;
  if (viewMode === ViewModes.NOTIFICATIONS) return <NotificationsPage />;
  if (viewMode === ViewModes.ADMIN) return <AdminPage />;
  if (viewMode === ViewModes.SAMPLES) return <SamplesPage />;
  if (viewMode === ViewModes.LOGS) return <LogsPage />;
  if (viewMode === ViewModes.MATRIX) return <MatrixPage />;

  return (
    <>
      <style jsx>{`
        .grid-container {
          display: grid;
          grid-template-columns: 1fr 1fr 2fr 2fr;
          grid-template-rows: auto auto;
          grid-template-areas:
            "card1 card1 card2 card2"
            "card3 card3 card2 card2";
          gap: 0rem 1rem;
          padding: 0.5rem;
        }
        .card1 {
          grid-area: card1;
        }
        .card3 {
          grid-area: card3;
        }
        .card2 {
          grid-area: card2;
        }
      `}</style>

      <div className="grid-container">
        <div className="card1">
          <SampleOverviewCard />
        </div>
        <div className="card3">
          <LogsCard />
        </div>
        <div className="card2">
          <CountyCard data={data} />
        </div>
      </div>
    </>
  );
}
