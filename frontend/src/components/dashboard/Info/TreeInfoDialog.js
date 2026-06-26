"use client";
import { Dialog } from "primereact/dialog";

export default function TreeInfoDialog({ visible, onHide }) {
  return (
    <Dialog
      header="Tree"
      visible={visible}
      onHide={onHide}
      style={{ width: "36rem" }}
      breakpoints={{ "960px": "75vw", "640px": "90vw" }}
    >
      <div className="text-sm line-height-3">
        <h4 className="mb-1 mt-0">View modes</h4>
        <ul className="pl-3 mt-1">
          <li>
            <b>Cluster View:</b> Collapses individual samples into their
            assigned clusters. Node size reflects the number of samples in the
            cluster. Click a cluster node to open a details panel with sample
            information.
          </li>
          <li>
            <b>Detail View:</b> Shows every individual sample as a leaf node.
            Use the <b>Color by</b> dropdown to colour leaves by a metadata
            property such as Hospital, County, or a typing field.
          </li>
        </ul>

        <h4 className="mb-1 mt-3">Layouts</h4>
        <ul className="pl-3 mt-1">
          <li>
            <b>Linear:</b> Standard rectangular cladogram (default).
          </li>
          <li>
            <b>Radial:</b> Circular layout, useful for large trees.
          </li>
          <li>
            <b>Unrooted:</b> Force-directed layout without an explicit root.
          </li>
        </ul>

        <h4 className="mb-1 mt-3">Navigation</h4>
        <ul className="pl-3 mt-1">
          <li>
            Scroll to <b>zoom</b> in and out.
          </li>
          <li>
            Use the <b>Width</b> and <b>Height</b> sliders to resize the canvas.
          </li>
          <li>
            Click <b>Reset View</b> to return to the default size and layout.
          </li>
        </ul>

        <p className="mt-3 text-color-secondary">
          <i>
            Only samples assigned to a cluster are shown in Cluster View.
            Singletons are excluded.
          </i>
        </p>
      </div>
    </Dialog>
  );
}
