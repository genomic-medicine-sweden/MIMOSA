"use client";

import { useEffect, useState, useRef } from "react";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Toast } from "primereact/toast";
import { Password } from "primereact/password";
import Cookies from "js-cookie";
import boundariesData from "@/assets/sweden-with-regions";
import { FloatLabel } from "primereact/floatlabel";
import { Button } from "primereact/button";

export default function SettingsPage() {
  const [county, setCounty] = useState(null);
  const [userInfo, setUserInfo] = useState({
    name: "Unknown",
    email: "Unknown",
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const toast = useRef(null);

  const counties = boundariesData.features.map((f) => ({
    label: f.properties.name,
    value: f.properties.name,
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

        if (parsed.homeCounty) {
          setCounty(parsed.homeCounty);
        }
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  const handleCountyChange = async (e) => {
    const newCounty = e.value;
    setCounty(newCounty);

    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/users/${parsed.email}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ homeCounty: newCounty }),
          },
        );

        const body = await res.text();

        if (!res.ok) throw new Error("Failed to update user");

        const updated = JSON.parse(body);
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/${parsed.email}/password`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            currentPassword,
            newPassword: password,
          }),
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
  return (
    <div className="p-4 max-w-xl mx-auto">
      <Toast ref={toast} position="bottom-right" />
      <h2 className="text-3xl font-semibold mb-4">Settings</h2>

      <div className="grid grid-cols-3 gap-x-4 items-center">
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

      <div className="mt-6 mb-2">
        <h3 className="text-xl font-semibold mb-4">Password</h3>
        <div className="flex flex-wrap gap-6">
          <FloatLabel>
            <Password
              id="current"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              toggleMask
              feedback={false}
              className="w-full"
            />
            <label htmlFor="current">Current Password</label>
          </FloatLabel>

          <FloatLabel>
            <Password
              id="new"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              toggleMask
              feedback={true}
              className="w-full"
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
              className="w-full"
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
    </div>
  );
}
