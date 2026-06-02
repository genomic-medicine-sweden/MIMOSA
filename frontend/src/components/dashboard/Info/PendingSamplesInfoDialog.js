"use client";
import { Dialog } from "primereact/dialog";

export default function PendingSamplesInfoDialog({ visible, onHide }) {
  return (
    <Dialog
      header="Pending Samples"
      visible={visible}
      onHide={onHide}
      style={{ width: "32rem" }}
      breakpoints={{ "960px": "75vw", "640px": "90vw" }}
    >
      <div className="text-sm line-height-3">
        <p>
          Pending samples let you pre-register geographical metadata for samples
          that have not yet been uploaded to MIMOSA.
        </p>
        <ul className="pl-3 mt-2">
          <li>
            <b>Expected Sample ID:</b> The ID that the incoming sample will
            carry. When a sample with this ID is uploaded, the metadata is
            applied automatically.
          </li>
          <li>
            <b>Geographical fields:</b> At least one of PostCode, Hospital, or
            Coordinates must be provided. These are applied to the sample on
            arrival.
          </li>
          <li>
            <b>Expiry:</b> Unmatched entries are removed automatically after a
            set number of days. Hover over the expiry column to see the exact
            date and time.
          </li>
          <li>
            <b>Editing:</b> Click the pencil icon in the table to edit an
            existing entry inline. Click the checkmark to save or the cross to
            cancel.
          </li>
        </ul>
        <p className="mt-2 text-color-secondary">
          <i>
            If the sample has already been uploaded, update its metadata
            directly from the Samples page instead.
          </i>
        </p>
      </div>
    </Dialog>
  );
}
