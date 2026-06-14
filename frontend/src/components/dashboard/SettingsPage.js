"use client";

import { useEffect, useState, useRef } from "react";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Toast } from "primereact/toast";
import { Password } from "primereact/password";
import { FloatLabel } from "primereact/floatlabel";
import { Button } from "primereact/button";
import { InputSwitch } from "primereact/inputswitch";
import { InputNumber } from "primereact/inputnumber";
import { MultiSelect } from "primereact/multiselect";
import { TabView, TabPanel } from "primereact/tabview";
import { useMapConfigContext } from "@/components/AppWrapper";
import NotificationInfoDialog from "@/components/dashboard/Info/NotificationInfoDialog";
import useOutbreakRules from "@/hooks/useOutbreakRules";
import { apiFetch } from "@/utils/apiFetch";

export default function SettingsPage() {
  const { boundariesData, regionNameKey, hospitalCoordinates } =
    useMapConfigContext();
  const [county, setCounty] = useState(null);
  const [userInfo, setUserInfo] = useState({
    name: "Unknown",
    email: "Unknown",
  });
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored)?.role === "admin" : false;
    } catch {
      return false;
    }
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notificationPreferences, setNotificationPreferences] = useState({
    outbreakAlerts: false,
    frequency: "immediate",
    alertThreshold: {},
    counties: [],
    hospitals: [],
    profiles: [],
    pipelineFailureAlerts: false,
    growthAlerts: false,
    growthThreshold: { type: "absolute", value: 5 },
    growthFrequency: "daily",
  });
  const [showInfo, setShowInfo] = useState(false);
  const [activeProfiles, setActiveProfiles] = useState([]);

  const allHospitals = Object.keys(hospitalCoordinates ?? {}).sort();

  const toast = useRef(null);
  const rules = useOutbreakRules();

  const counties = boundariesData.features.map((f) => ({
    label: f.properties[regionNameKey],
    value: f.properties[regionNameKey],
  }));

  const frequencyOptions = [
    { label: "Immediate", value: "immediate" },
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
  ];

  const growthTypeOptions = [
    { label: "Absolute growth", value: "absolute" },
    { label: "Total size reached", value: "total" },
    { label: "Percent increase", value: "percent" },
  ];

  const growthFrequencyOptions = [
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
  ];

  const growthValueLabel = {
    absolute: "samples grown",
    total: "total samples",
    percent: "percent (%)",
  };

  const getClusterSizeOptions = (threshold) =>
    Array.from({ length: 20 }, (_, i) => ({
      label: String(threshold + i),
      value: threshold + i,
    }));

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUserInfo({
          name: `${parsed.firstName || "Unknown"} ${parsed.lastName || ""}`.trim(),
          email: parsed.email || "Unknown",
        });
        if (parsed.role === "admin") setIsAdmin(true);
        if (parsed.homeCounty) setCounty(parsed.homeCounty);
        if (parsed.notificationPreferences) {
          setNotificationPreferences({
            outbreakAlerts:
              parsed.notificationPreferences.outbreakAlerts ?? false,
            frequency: parsed.notificationPreferences.frequency ?? "daily",
            alertThreshold: parsed.notificationPreferences.alertThreshold ?? {},
            counties: parsed.notificationPreferences.counties ?? [],
            hospitals: parsed.notificationPreferences.hospitals ?? [],
            profiles: parsed.notificationPreferences.profiles ?? [],
            pipelineFailureAlerts:
              parsed.notificationPreferences.pipelineFailureAlerts ?? false,
            growthAlerts: parsed.notificationPreferences.growthAlerts ?? false,
            growthThreshold: parsed.notificationPreferences.growthThreshold ?? {
              type: "absolute",
              value: 5,
            },
            growthFrequency:
              parsed.notificationPreferences.growthFrequency ?? "daily",
          });
        }
      } catch (err) {
        console.error(err);
      }
    }

    apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/outbreaks/all-profiles`)
      .then((res) => res?.json())
      .then((profiles) => {
        if (Array.isArray(profiles)) setActiveProfiles(profiles);
      })
      .catch(() => {});

    apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`)
      .then((res) => res?.json())
      .then((fresh) => {
        if (!fresh) return;
        const storedRaw = localStorage.getItem("user");
        const stored = storedRaw ? JSON.parse(storedRaw) : {};
        localStorage.setItem("user", JSON.stringify({ ...stored, ...fresh }));
        setUserInfo({
          name: `${fresh.firstName || "Unknown"} ${fresh.lastName || ""}`.trim(),
          email: fresh.email || "Unknown",
        });
        if (fresh.role === "admin") setIsAdmin(true);
        if (fresh.homeCounty != null) setCounty(fresh.homeCounty);
        if (fresh.notificationPreferences) {
          setNotificationPreferences({
            outbreakAlerts:
              fresh.notificationPreferences.outbreakAlerts ?? false,
            frequency: fresh.notificationPreferences.frequency ?? "daily",
            alertThreshold: fresh.notificationPreferences.alertThreshold ?? {},
            counties: fresh.notificationPreferences.counties ?? [],
            hospitals: fresh.notificationPreferences.hospitals ?? [],
            profiles: fresh.notificationPreferences.profiles ?? [],
            pipelineFailureAlerts:
              fresh.notificationPreferences.pipelineFailureAlerts ?? false,
            growthAlerts: fresh.notificationPreferences.growthAlerts ?? false,
            growthThreshold: fresh.notificationPreferences.growthThreshold ?? {
              type: "absolute",
              value: 5,
            },
            growthFrequency:
              fresh.notificationPreferences.growthFrequency ?? "daily",
          });
        }
      })
      .catch(() => {});
  }, []);

  const updateNotificationPreference = async (key, value) => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;
    const previous = notificationPreferences;
    const newPrefs = { ...notificationPreferences, [key]: value };
    setNotificationPreferences(newPrefs);
    try {
      const parsed = JSON.parse(storedUser);
      const res = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/${parsed.email}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationPreferences: { [key]: value } }),
        },
      );
      if (!res.ok) throw new Error("Failed to update notification preferences");
      parsed.notificationPreferences = {
        ...(parsed.notificationPreferences || {}),
        [key]: value,
      };
      localStorage.setItem("user", JSON.stringify(parsed));
      toast.current?.show({
        severity: "success",
        summary: "Saved",
        detail: "Notification preferences updated.",
        life: 2000,
      });
    } catch (err) {
      console.error(err);
      setNotificationPreferences(previous);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to update notification preferences.",
        life: 3000,
      });
    }
  };

  const handleCountyChange = async (e) => {
    const newCounty = e.value;
    setCounty(newCounty);
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;
    try {
      const parsed = JSON.parse(storedUser);
      const res = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/${parsed.email}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ homeCounty: newCounty }),
        },
      );
      if (!res.ok) throw new Error("Failed to update user");
      const updated = await res.json();
      parsed.homeCounty = updated.homeCounty;
      localStorage.setItem("user", JSON.stringify(parsed));
      toast.current?.show({
        severity: "success",
        summary: "Success",
        detail: "County updated successfully.",
        life: 3000,
      });
    } catch (err) {
      console.error(err);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to update county.",
        life: 3000,
      });
    }
  };

  const handlePasswordUpdate = async () => {
    if (password !== confirmPassword) {
      toast.current?.show({
        severity: "warn",
        summary: "Warning",
        detail: "Passwords do not match.",
        life: 3000,
      });
      return;
    }
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;
    try {
      const parsed = JSON.parse(storedUser);
      const res = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/${parsed.email}/password`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword: password }),
        },
      );
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.message || "Password update failed");
      }
      toast.current?.show({
        severity: "success",
        summary: "Password Updated",
        detail: "Your password was updated successfully.",
        life: 3000,
      });
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: err.message || "Failed to update password.",
        life: 3000,
      });
    }
  };

  const profileKeys = Object.keys(rules?.profiles ?? {});
  const allProfileKeys = rules
    ? [...new Set([...profileKeys, ...activeProfiles])]
    : [];
  const thresholdEntries = rules
    ? [
        {
          key: "default",
          threshold: rules.default.detectionThreshold,
          isDefault: true,
        },
        ...allProfileKeys.map((p) => ({
          key: p,
          threshold:
            rules.profiles[p]?.detectionThreshold ??
            rules.default.detectionThreshold,
          isDefault: false,
        })),
      ]
    : [];

  return (
    <div className="p-4 max-w-xl mx-auto">
      <Toast ref={toast} position="bottom-right" />
      <h2 className="text-3xl font-semibold mb-4">Settings</h2>

      <TabView>
        <TabPanel
          header={
            <span className="flex align-items-center gap-2">
              Notifications
              <i
                className="pi pi-info-circle text-500 hover:text-700 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInfo(true);
                }}
              />
            </span>
          }
        >
          <div className="flex flex-column gap-3 mt-2">
            <div className="flex align-items-center gap-3">
              <span className="font-medium w-10rem">Outbreak Alerts</span>
              <InputSwitch
                checked={notificationPreferences.outbreakAlerts}
                onChange={(e) =>
                  updateNotificationPreference("outbreakAlerts", e.value)
                }
              />
            </div>
            <div className="flex align-items-center gap-3">
              <span className="font-medium w-10rem">Frequency</span>
              <Dropdown
                value={notificationPreferences.frequency}
                options={frequencyOptions}
                onChange={(e) =>
                  updateNotificationPreference("frequency", e.value)
                }
                disabled={!notificationPreferences.outbreakAlerts}
                style={{ width: "12rem" }}
              />
            </div>
            {thresholdEntries.length > 0 && (
              <div className="flex flex-column gap-2">
                <span className="font-medium">Alert Thresholds</span>

                {thresholdEntries
                  .filter((e) => e.isDefault)
                  .map(({ key, threshold }) => (
                    <div className="flex align-items-center gap-3" key={key}>
                      <label className="text-color-secondary w-10rem">
                        Default
                      </label>
                      <Dropdown
                        value={
                          notificationPreferences.alertThreshold?.[key] ??
                          threshold
                        }
                        options={getClusterSizeOptions(threshold)}
                        onChange={(e) =>
                          updateNotificationPreference("alertThreshold", {
                            ...notificationPreferences.alertThreshold,
                            [key]: e.value,
                          })
                        }
                        disabled={!notificationPreferences.outbreakAlerts}
                        style={{ width: "12rem" }}
                      />
                    </div>
                  ))}

                {allProfileKeys.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-1">
                    {thresholdEntries
                      .filter((e) => !e.isDefault)
                      .map(({ key, threshold }) => (
                        <div className="flex flex-column gap-1" key={key}>
                          <label className="text-sm text-color-secondary">
                            <i>{key.replace(/_/g, " ")}</i>
                          </label>
                          <Dropdown
                            value={
                              notificationPreferences.alertThreshold?.[key] ??
                              threshold
                            }
                            options={getClusterSizeOptions(threshold)}
                            onChange={(e) =>
                              updateNotificationPreference("alertThreshold", {
                                ...notificationPreferences.alertThreshold,
                                [key]: e.value,
                              })
                            }
                            disabled={!notificationPreferences.outbreakAlerts}
                            style={{ width: "10rem" }}
                          />
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-column gap-1">
              <span className="font-medium">Species watchlist</span>
              <span className="text-sm text-color-secondary">
                Leave empty to receive alerts for all species.
              </span>
              <MultiSelect
                value={notificationPreferences.profiles}
                options={allProfileKeys.map((p) => ({
                  label: p.replace(/_/g, " "),
                  value: p,
                }))}
                onChange={(e) => {
                  const val =
                    e.value.length === allProfileKeys.length ? [] : e.value;
                  updateNotificationPreference("profiles", val);
                }}
                placeholder="All species"
                disabled={!notificationPreferences.outbreakAlerts}
                display="chip"
                filter
                style={{ width: "100%" }}
              />
            </div>

            <div className="flex flex-column gap-1">
              <span className="font-medium">County watchlist</span>
              <span className="text-sm text-color-secondary">
                Leave empty to receive alerts for all counties.
              </span>
              <MultiSelect
                value={notificationPreferences.counties}
                options={counties}
                onChange={(e) =>
                  updateNotificationPreference("counties", e.value)
                }
                placeholder="All counties"
                disabled={!notificationPreferences.outbreakAlerts}
                display="chip"
                filter
                style={{ width: "100%" }}
              />
            </div>

            <div className="flex flex-column gap-1">
              <span className="font-medium">Hospital watchlist</span>
              <span className="text-sm text-color-secondary">
                Leave empty to receive alerts for all hospitals.
              </span>
              <MultiSelect
                value={notificationPreferences.hospitals}
                options={allHospitals.map((h) => ({ label: h, value: h }))}
                onChange={(e) =>
                  updateNotificationPreference("hospitals", e.value)
                }
                placeholder="All hospitals"
                disabled={!notificationPreferences.outbreakAlerts}
                display="chip"
                filter
                style={{ width: "100%" }}
              />
            </div>

            <div className="flex align-items-center gap-3 mt-4">
              <span className="font-medium w-10rem">Growth Alerts</span>
              <InputSwitch
                checked={notificationPreferences.growthAlerts}
                disabled={!notificationPreferences.outbreakAlerts}
                onChange={(e) =>
                  updateNotificationPreference("growthAlerts", e.value)
                }
              />
            </div>
            {notificationPreferences.growthAlerts && (
              <>
                <div className="flex align-items-center gap-3">
                  <span className="font-medium w-10rem">Growth frequency</span>
                  <Dropdown
                    value={notificationPreferences.growthFrequency}
                    options={growthFrequencyOptions}
                    onChange={(e) =>
                      updateNotificationPreference("growthFrequency", e.value)
                    }
                    style={{ width: "12rem" }}
                  />
                </div>
                <div className="flex align-items-center gap-3">
                  <span className="font-medium w-10rem">Growth type</span>
                  <Dropdown
                    value={notificationPreferences.growthThreshold.type}
                    options={growthTypeOptions}
                    onChange={(e) =>
                      updateNotificationPreference("growthThreshold", {
                        ...notificationPreferences.growthThreshold,
                        type: e.value,
                      })
                    }
                    style={{ width: "12rem" }}
                  />
                </div>
                <div className="flex align-items-center gap-3">
                  <span className="font-medium w-10rem">Growth value</span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <InputNumber
                      value={notificationPreferences.growthThreshold.value}
                      onValueChange={(e) =>
                        updateNotificationPreference("growthThreshold", {
                          ...notificationPreferences.growthThreshold,
                          value: e.value ?? 1,
                        })
                      }
                      min={1}
                      max={
                        notificationPreferences.growthThreshold.type ===
                        "percent"
                          ? 1000
                          : 10000
                      }
                      inputStyle={{ width: "6rem" }}
                    />
                    <span className="text-500 text-sm">
                      {
                        growthValueLabel[
                          notificationPreferences.growthThreshold.type
                        ]
                      }
                    </span>
                  </div>
                </div>
              </>
            )}

            {isAdmin && (
              <div className="flex align-items-center gap-3 mt-4">
                <span className="font-medium w-10rem">Pipeline Failures</span>
                <InputSwitch
                  checked={notificationPreferences.pipelineFailureAlerts}
                  onChange={(e) =>
                    updateNotificationPreference(
                      "pipelineFailureAlerts",
                      e.value,
                    )
                  }
                />
              </div>
            )}
          </div>
        </TabPanel>

        <TabPanel header="General">
          <div className="grid grid-cols-3 gap-x-4 items-center mt-2">
            <label className="text-right font-medium">Name</label>
            <InputText
              value={userInfo.name}
              disabled
              className="col-span-2 w-full mb-4"
            />
            <label className="text-right font-medium">Email</label>
            <InputText
              value={userInfo.email}
              disabled
              className="col-span-2 w-full mb-4"
            />
            <label className="text-right font-medium">My County</label>
            <Dropdown
              value={county}
              options={counties}
              onChange={handleCountyChange}
              placeholder="Select a County"
              className="col-span-2 w-full mb-4"
            />
          </div>

          <div className="mt-2">
            <h3 className="text-xl font-semibold mb-4">Password</h3>
            <div className="flex flex-wrap gap-6">
              <FloatLabel>
                <Password
                  id="current"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  toggleMask
                  feedback={false}
                />
                <label htmlFor="current">Current Password</label>
              </FloatLabel>
              <FloatLabel>
                <Password
                  id="new"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  toggleMask
                  feedback
                />
                <label htmlFor="new">New Password</label>
              </FloatLabel>
              <FloatLabel>
                <Password
                  id="confirm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  toggleMask
                  feedback={false}
                />
                <label htmlFor="confirm">Confirm Password</label>
              </FloatLabel>
              <div className="flex items-end">
                <Button
                  label="Update"
                  onClick={handlePasswordUpdate}
                  className="p-button-sm"
                />
              </div>
            </div>
          </div>
        </TabPanel>
      </TabView>

      <NotificationInfoDialog
        visible={showInfo}
        onHide={() => setShowInfo(false)}
        isAdmin={isAdmin}
      />
    </div>
  );
}
