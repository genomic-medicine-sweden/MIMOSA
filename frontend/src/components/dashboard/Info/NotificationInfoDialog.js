"use client";
import { Dialog } from "primereact/dialog";

export default function NotificationInfoDialog({ visible, onHide, isAdmin }) {
  return (
    <Dialog
      header="Notification Settings"
      visible={visible}
      onHide={onHide}
      style={{ width: "30rem" }}
      breakpoints={{ "960px": "75vw", "640px": "90vw" }}
    >
      <div className="text-sm line-height-3">
        <p>These settings control how outbreak alerts are delivered.</p>
        <ul className="pl-3 mt-2">
          <li>
            <b>Outbreak Alerts:</b> Enable or disable notifications.
          </li>
          <li>
            <b>Frequency:</b> Choose how often alerts are sent (immediate,
            daily, or weekly summaries).
          </li>
          <li>
            <b>Alert Threshold:</b> The minimum number of cases in a cluster
            required for <u>you</u> to be notified.
            <br />
            If multiple analysis profiles are configured, each profile can have
            its own threshold.
            <br />
            <span className="pl-3 mt-1 block text-color-secondary">
              <i>
                Note: you cannot set a threshold below the outbreak threshold
                for that profile.
              </i>
            </span>
          </li>
          {isAdmin && (
            <li className="mt-2">
              <b>Pipeline Failures:</b> Receive an email if the data pipeline
              encounters errors during a run. This alert is sent to all admin
              users who have this option enabled.
              <br />
              <span className="pl-3 mt-1 block text-color-secondary"></span>
            </li>
          )}
        </ul>
      </div>
    </Dialog>
  );
}
