"use client";
import dynamic from "next/dynamic";
import { useViewMode, ViewModes } from "@/components/dashboard/ViewModeContext";
import useAppData from "@/hooks/useAppData";
import DashboardOverview from "@/components/dashboard/DashboardOverview";

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
const PendingSamplesPage = dynamic(
  () => import("@/components/dashboard/PendingSamplesPage"),
  { ssr: false },
);
const LogsPage = dynamic(() => import("@/components/dashboard/LogsPage"), {
  ssr: false,
});
const MatrixPage = dynamic(() => import("@/components/dashboard/MatrixPage"), {
  ssr: false,
});
const TreePage = dynamic(() => import("@/components/dashboard/TreePage"), {
  ssr: false,
});
const TimelinePage = dynamic(
  () => import("@/components/dashboard/TimelinePage"),
  { ssr: false },
);
const ReportsPage = dynamic(
  () => import("@/components/dashboard/ReportsPage"),
  { ssr: false },
);
const ImportPage = dynamic(() => import("@/components/dashboard/ImportPage"), {
  ssr: false,
});

export default function DashboardPage() {
  const { viewMode } = useViewMode();
  const { data, logs } = useAppData();

  if (viewMode === ViewModes.MY_COUNTY) return <MyCountyView data={data} />;
  if (viewMode === ViewModes.SETTINGS) return <SettingsPage />;
  if (viewMode === ViewModes.NOTIFICATIONS) return <NotificationsPage />;
  if (viewMode === ViewModes.ADMIN) return <AdminPage />;
  if (viewMode === ViewModes.SAMPLES) return <SamplesPage />;
  if (viewMode === ViewModes.PENDING_SAMPLES) return <PendingSamplesPage />;
  if (viewMode === ViewModes.LOGS) return <LogsPage />;
  if (viewMode === ViewModes.MATRIX) return <MatrixPage />;
  if (viewMode === ViewModes.TREE) return <TreePage />;
  if (viewMode === ViewModes.TIMELINE) return <TimelinePage />;
  if (viewMode === ViewModes.REPORTS) return <ReportsPage />;
  if (viewMode === ViewModes.IMPORT) return <ImportPage />;

  return <DashboardOverview data={data} logs={logs} />;
}
