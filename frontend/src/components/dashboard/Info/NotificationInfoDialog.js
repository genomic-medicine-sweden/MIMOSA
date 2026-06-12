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
            required for <u>you</u> to be notified. There is a <i>default</i>{" "}
            threshold that applies to any profile without its own entry, plus an
            individual threshold for each configured analysis profile.
            <br />
            <span className="pl-3 mt-1 block text-color-secondary">
              <i>
                Note: you cannot set a threshold below the detection threshold
                for that profile.
              </i>
            </span>
          </li>
          <li className="mt-2">
            <b>Growth Alerts:</b> Opt-in notifications for existing clusters
            that grow after they were first detected. These are always delivered
            as a digest on the schedule set by <i>Growth frequency</i> —
            regardless of your outbreak alert frequency.
            <ul className="pl-3 mt-1">
              <li>
                <b>Growth type:</b> Choose what triggers a growth notification:
                <ul className="pl-3">
                  <li>
                    <i>Absolute growth</i> — cluster has grown by at least N
                    samples since the last notification.
                  </li>
                  <li>
                    <i>Total size reached</i> — cluster total has crossed N
                    samples (fires once when the threshold is crossed).
                  </li>
                  <li>
                    <i>Percent increase</i> — cluster has grown by at least N%
                    since the last notification.
                  </li>
                </ul>
              </li>
              <li>
                <b>Growth value:</b> The numeric threshold for the chosen type.
              </li>
              <li>
                <b>Growth frequency:</b> How often growth digests are sent
                (daily or weekly).
              </li>
            </ul>
          </li>
          {isAdmin && (
            <li className="mt-2">
              <b>Pipeline Failures:</b> Receive an email if the data pipeline
              encounters errors during a run. This alert is sent to all admin
              users who have this option enabled.
              <br />
            </li>
          )}
        </ul>
      </div>
    </Dialog>
  );
}
