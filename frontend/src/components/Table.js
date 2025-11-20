import React, { useState, useRef, useEffect } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Tooltip } from "primereact/tooltip";
import postcodeData from "@/assets/postcode-coordinates.js";
import ExportButton from "@/components/export/ExportButton";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import calculateDistance from "@/utils/distance.js";
import HospitalCoordinates from "@/assets/hospital-coordinates";

const isModifiedRecently = (sampleId, logs) => {
  const log = logs.find((log) => log.sample_id === sampleId);
  if (!log || !log.updates || log.updates.length === 0) return false;

  const now = new Date();
  return log.updates.some((update) => {
    const updateDate = new Date(update.date);
    const diffHours = (now - updateDate) / (1000 * 60 * 60);
    return diffHours <= 24;
  });
};

const bonsaiUrl = process.env.NEXT_PUBLIC_BONSAI_URL;

const Table = ({ filteredData, similarity, dateRange, logs }) => {
  const [rows, setRows] = useState(5);
  const [first, setFirst] = useState(0);
  const [expandedRows, setExpandedRows] = useState([]);
  const [showSampleHistory, setShowSampleHistory] = useState({});
  const dt = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (tooltipRef.current) tooltipRef.current.updateTargetEvents();
  }, [filteredData, similarity, rows, first]);

  const getRelevantSimilarity = (sampleId) => {
    const entries = similarity.filter((item) => item.ID === sampleId);
    if (entries.length === 0) return null;

    if (!dateRange || dateRange.length === 0) {
      return entries.reduce((latest, current) =>
        new Date(current.createdAt) > new Date(latest.createdAt)
          ? current
          : latest,
      );
    }

    const targetDate = new Date(dateRange[0]);
    return entries.reduce((closest, current) => {
      const currentDate = new Date(current.createdAt);
      const closestDate = new Date(closest.createdAt);
      const currentDiff = Math.abs(currentDate - targetDate);
      const closestDiff = Math.abs(closestDate - targetDate);
      return currentDiff < closestDiff ? current : closest;
    });
  };

  const rowExpansionTemplate = (rowData) => {
    const similarData = getRelevantSimilarity(rowData.properties.ID);
    const sampleLog = logs.find(
      (log) => log.sample_id === rowData.properties.ID,
    );

    const mainPostcode = rowData.properties.PostCode;
    const mainCoordinates = postcodeData[mainPostcode]?.coordinates || [];
    const mainHospital = rowData.properties.Hospital;
    const mainHospitalPostcode = HospitalCoordinates[mainHospital]?.PostCode;
    const mainHospitalCoordinates =
      postcodeData[mainHospitalPostcode]?.coordinates || [];

    const findPostcodeById = (id) => {
      const matchingSample = filteredData.find(
        (item) => item.properties.ID === id,
      );
      return matchingSample ? matchingSample.properties.PostCode : null;
    };

    const findHospitalById = (id) => {
      const matchingSample = filteredData.find(
        (item) => item.properties.ID === id,
      );
      return matchingSample ? matchingSample.properties.Hospital : null;
    };

    return (
      <div className="p-3">
        <h3>Additional Information</h3>
        <p>
          <strong>Partition:</strong> {rowData.properties.Partition}
        </p>
        <p>
          <strong>Pipeline Version:</strong>{" "}
          {rowData.properties.Pipeline_Version}
        </p>
        <p>
          <strong>Date of Analysis:</strong> {rowData.properties.Pipeline_Date}
        </p>
        <p>
          <strong>QC Status:</strong> {rowData.properties.QC_Status}
        </p>
        <p>
          <a
            href={`${bonsaiUrl}/sample/${rowData.properties.ID}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "underline", color: "#007ad9" }}
          >
            View Sample in Bonsai
          </a>
        </p>
        <p>
          <strong>ST:</strong>{" "}
          {!isNaN(parseInt(rowData?.properties?.typing?.ST))
            ? parseInt(rowData.properties.typing.ST)
            : rowData?.properties?.typing?.ST || "N/A"}
        </p>

        <table style={{ marginLeft: "1rem" }}>
          <thead>
            <tr>
              <th>Gene</th>
              {Object.keys(rowData.properties.typing.alleles).map((gene) => (
                <th key={gene}>{gene}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ textAlign: "center" }}>Allele No</td>
              {Object.values(rowData.properties.typing.alleles).map(
                (allele, index) => (
                  <td key={index} style={{ textAlign: "center" }}>
                    {!isNaN(parseInt(allele))
                      ? parseInt(allele)
                      : allele || "N/A"}
                  </td>
                ),
              )}
            </tr>
          </tbody>
        </table>

        {similarData && similarData.similar.length > 0 && (
          <>
            <h3>Similar Samples</h3>
            <table style={{ marginTop: "1rem" }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Similarity</th>
                  <th>Distance (km)</th>
                  <th>Hospital Distance (km)</th>
                </tr>
              </thead>
              <tbody>
                {similarData.similar
                  .filter(
                    (similarSample) =>
                      similarSample.ID !== rowData.properties.ID,
                  )
                  .map((similarSample) => {
                    const similarPostcode = findPostcodeById(similarSample.ID);
                    const similarCoordinates =
                      postcodeData[similarPostcode]?.coordinates || [];

                    const similarHospital = findHospitalById(similarSample.ID);
                    const similarHospitalPostcode =
                      HospitalCoordinates[similarHospital]?.PostCode;
                    const similarHospitalCoordinates =
                      postcodeData[similarHospitalPostcode]?.coordinates || [];

                    const distance =
                      mainCoordinates.length === 2 &&
                      similarCoordinates.length === 2
                        ? calculateDistance(
                            mainCoordinates[0],
                            mainCoordinates[1],
                            similarCoordinates[0],
                            similarCoordinates[1],
                          ).toFixed(2)
                        : "N/A";

                    const hospitalDistance =
                      mainHospitalCoordinates.length === 2 &&
                      similarHospitalCoordinates.length === 2
                        ? calculateDistance(
                            mainHospitalCoordinates[0],
                            mainHospitalCoordinates[1],
                            similarHospitalCoordinates[0],
                            similarHospitalCoordinates[1],
                          ).toFixed(2)
                        : "N/A";

                    return (
                      <tr key={similarSample.ID}>
                        <td style={{ textAlign: "center" }}>
                          {similarSample.ID}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {parseFloat(similarSample.similarity).toFixed(2)}
                        </td>
                        <td style={{ textAlign: "center" }}>{distance}</td>
                        <td style={{ textAlign: "center" }}>
                          {hospitalDistance}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </>
        )}

        {sampleLog && (
          <div style={{ marginTop: "1rem" }}>
            <div
              onClick={() =>
                setShowSampleHistory((prev) => ({
                  ...prev,
                  [rowData.properties.ID]: !prev[rowData.properties.ID],
                }))
              }
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                userSelect: "none",
                fontWeight: "bold",
                color: "#495057",
                marginBottom: "0.5rem",
              }}
            >
              <i
                className={`pi ${
                  showSampleHistory[rowData.properties.ID]
                    ? "pi-chevron-down"
                    : "pi-chevron-right"
                }`}
                style={{
                  marginRight: "0.5rem",
                  borderRadius: "50%",
                  background: "#f4f4f4",
                  padding: "0.3rem",
                  fontSize: "0.9rem",
                }}
              />
              <h3> Sample History </h3>
            </div>

            {showSampleHistory[rowData.properties.ID] && (
              <>
                <p>
                  <strong>Added At:</strong>{" "}
                  {new Date(sampleLog.added_at).toLocaleString()}
                </p>
                {sampleLog.updates.length > 0 && (
                  <table
                    style={{
                      marginTop: "1rem",
                      width: "100%",
                      borderCollapse: "collapse",
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            borderBottom: "1px solid #ccc",
                            padding: "8px",
                          }}
                        >
                          Date
                        </th>
                        <th
                          style={{
                            borderBottom: "1px solid #ccc",
                            padding: "8px",
                          }}
                        >
                          Field
                        </th>
                        <th
                          style={{
                            borderBottom: "1px solid #ccc",
                            padding: "8px",
                          }}
                        >
                          Old Value
                        </th>
                        <th
                          style={{
                            borderBottom: "1px solid #ccc",
                            padding: "8px",
                          }}
                        >
                          New Value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sampleLog.updates.map((update, index) =>
                        Object.entries(update.changes).map(
                          ([field, change]) => (
                            <tr key={`${index}-${field}`}>
                              <td
                                style={{
                                  borderBottom: "1px solid #eee",
                                  padding: "8px",
                                }}
                              >
                                {new Date(update.date).toLocaleString()}
                              </td>
                              <td
                                style={{
                                  borderBottom: "1px solid #eee",
                                  padding: "8px",
                                }}
                              >
                                {field}
                              </td>
                              <td
                                style={{
                                  borderBottom: "1px solid #eee",
                                  padding: "8px",
                                }}
                              >
                                {change.old}
                              </td>
                              <td
                                style={{
                                  borderBottom: "1px solid #eee",
                                  padding: "8px",
                                }}
                              >
                                {change.new}
                              </td>
                            </tr>
                          ),
                        ),
                      )}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const getPostalTown = (postcode) => {
    const entry = postcodeData[postcode];
    return entry && entry.postaltown !== "0" ? entry.postaltown : "";
  };

  const getCounty = (postcode) => {
    const entry = postcodeData[postcode];
    return entry && entry.County !== "0" ? entry.County : "";
  };

  const formatPostcode = (postcode) =>
    postcode.substring(Math.max(postcode.length - 5, 0));

  const checkIntraInter = (Cluster_ID, county) => {
    let intra = false;
    let inter = false;
    const sameCluster = filteredData.filter(
      (item) => item.properties.Cluster_ID === Cluster_ID,
    );
    sameCluster.forEach((item) => {
      const itemCounty = getCounty(item.properties.PostCode);
      if (itemCounty === county) {
        if (
          !intra &&
          sameCluster.filter((i) => getCounty(i.properties.PostCode) === county)
            .length > 1
        ) {
          intra = true;
        }
      } else {
        inter = true;
      }
    });
    return { intra, inter };
  };

  const severityBodyTemplate = (rowData) => {
    const date = new Date(rowData.properties.Date);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    const Cluster_ID = rowData.properties.Cluster_ID;
    const county = getCounty(rowData.properties.PostCode);
    const { intra, inter } = county
      ? checkIntraInter(Cluster_ID, county)
      : { intra: false, inter: false };

    const recentlyModified = isModifiedRecently(rowData.properties.ID, logs);

    return (
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {diffDays < 7 && (
          <Tag
            value="New"
            className="tag-new"
            data-pr-tooltip="Newly reported (within 7 days)"
          />
        )}
        {recentlyModified && (
          <Tag
            value="Modified"
            className="tag-modified"
            style={{ backgroundColor: "yellowgreen", color: "white" }}
            data-pr-tooltip="Modified within last 24 hours"
          />
        )}
        {intra && (
          <Tag
            value="Intra"
            style={{ backgroundColor: "orange", color: "white" }}
            className="tag-intra"
            data-pr-tooltip="Within County - Same Cluster_ID"
          />
        )}
        {inter && (
          <Tag
            value="Inter"
            style={{ backgroundColor: "red", color: "white" }}
            className="tag-inter"
            data-pr-tooltip="Across Counties - Same Cluster_ID"
          />
        )}
      </div>
    );
  };

  const header = (
    <div className="flex align-items-center justify-content-end gap-2">
      <ExportButton data={filteredData} fileName="table_data" />
    </div>
  );

  const footer = `${filteredData ? filteredData.length : 0} Records.`;

  const handlePageChange = (event) => {
    setFirst(event.first);
    setRows(event.rows);
  };

  return (
    <div className="card">
      <Tooltip target=".export-buttons>button" position="bottom" />
      <DataTable
        ref={dt}
        value={filteredData}
        header={header}
        footer={footer}
        paginator
        first={first}
        rows={rows}
        rowsPerPageOptions={[5, 10, 25, 50]}
        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        currentPageReportTemplate="{first} to {last} of {totalRecords}"
        onPage={handlePageChange}
        tableStyle={{ minWidth: "60rem" }}
        sortField="properties.Date"
        sortOrder={-1}
        rowExpansionTemplate={rowExpansionTemplate}
        onRowToggle={(e) => setExpandedRows(e.data)}
        dataKey="properties.ID"
        expandedRows={expandedRows}
      >
        <Column expander style={{ width: "3rem" }} />
        <Column field="properties.ID" header="ID" sortable />
        <Column
          header="Analysis Profile"
          body={(rowData) => (
            <span style={{ fontStyle: "italic" }}>
              {rowData.properties.analysis_profile.replace(/_/g, " ")}
            </span>
          )}
          sortable
        />
        <Column field="properties.Cluster_ID" header="Cluster_ID" sortable />
        <Column field="properties.Date" header="Date" sortable />
        <Column
          header="Postcode"
          body={(rowData) => formatPostcode(rowData.properties.PostCode)}
          sortable
        />
        <Column
          header="Postal Town"
          body={(rowData) => getPostalTown(rowData.properties.PostCode)}
          sortable
        />
        <Column
          header="County"
          body={(rowData) => getCounty(rowData.properties.PostCode)}
          sortable
        />
        <Column
          header="Hospital"
          body={(rowData) => rowData.properties.Hospital}
          sortable
        />
        <Column header="" body={severityBodyTemplate} />
      </DataTable>
      <Tooltip
        ref={tooltipRef}
        target=".tag-new, .tag-intra, .tag-inter, .tag-modified"
        position="bottom"
      />
    </div>
  );
};

export default Table;
