import React, { useState, useRef, useEffect } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Tooltip } from "primereact/tooltip";
import postcodeData from "./assets/postcode-coordinates.js";
import { ExportButton } from "./Export";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import calculateDistance from "./distance.js";
import HospitalCoordinates from "./assets/hospital-coordinates";

const Table = ({ filteredData, similarity }) => {
  const [rows, setRows] = useState(5);
  const [first, setFirst] = useState(0);
  const [expandedRows, setExpandedRows] = useState([]);
  const dt = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (tooltipRef.current) tooltipRef.current.updateTargetEvents();
  }, [filteredData, similarity, rows, first]);

  const rowExpansionTemplate = (rowData) => {
    const similarData = Array.isArray(similarity)
      ? similarity.find((item) => item.ID === rowData.properties.ID)
      : null;

    const mainPostcode = rowData.properties.PostCode;
    const mainCoordinates = postcodeData[mainPostcode]?.coordinates || [];
    const mainHospital = rowData.properties.Hospital;
    const mainHospitalCoordinates =
      HospitalCoordinates[mainHospital]?.coordinates || [];

    const findPostcodeById = (id) => {
      const matchingSample = filteredData.find(
        (item) => item.properties.ID === id
      );
      return matchingSample ? matchingSample.properties.PostCode : null;
    };

    const findHospitalById = (id) => {
      const matchingSample = filteredData.find(
        (item) => item.properties.ID === id
      );
      return matchingSample ? matchingSample.properties.Hospital : null;
    };

    return (
      <div className="p-3">
        <h3>Additional Information</h3>
	<p><strong>QC Status:</strong> {rowData.properties.QC_Status}</p>
        <p><strong>ST:</strong> {rowData.properties.ST}</p> 
        <table style={{ margin: "left" }}>
          <thead>
            <tr>
              <th>Gene</th>
              <th>arcC</th>
              <th>aroE</th>
              <th>pta</th>
              <th>glpF</th>
              <th>gmk</th>
              <th>tpi</th>
              <th>yqiL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ textAlign: "center" }}>Allele No</td>
              <td style={{ textAlign: "center" }}>{rowData.properties.arcC}</td>
              <td style={{ textAlign: "center" }}>{rowData.properties.aroE}</td>
              <td style={{ textAlign: "center" }}>{rowData.properties.pta}</td>
              <td style={{ textAlign: "center" }}>{rowData.properties.glpF}</td>
              <td style={{ textAlign: "center" }}>{rowData.properties.gmk}</td>
              <td style={{ textAlign: "center" }}>{rowData.properties.tpi}</td>
              <td style={{ textAlign: "center" }}>{rowData.properties.yqiL}</td>
            </tr>
          </tbody>
        </table>

        {similarData && similarData.similar.length > 0 && (
          <>
            <h3>Similar Samples</h3>
            <table style={{ margin: "left", marginTop: "1rem" }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Similarity</th>
                  <th>Distance (km)</th>
                  <th>Hospital Distance (km)</th>
                </tr>
              </thead>
              <tbody>
                {similarData.similar.map((similarSample) => {
                  const similarPostcode = findPostcodeById(similarSample.ID);
                  const similarCoordinates =
                    postcodeData[similarPostcode]?.coordinates || [];

                  const similarHospital = findHospitalById(similarSample.ID);
                  const similarHospitalCoordinates =
                    HospitalCoordinates[similarHospital]?.coordinates || [];

                  const distance =
                    mainCoordinates.length === 2 &&
                    similarCoordinates.length === 2
                      ? calculateDistance(
                          mainCoordinates[0],
                          mainCoordinates[1],
                          similarCoordinates[0],
                          similarCoordinates[1]
                        ).toFixed(2)
                      : "N/A";

                  const hospitalDistance =
                    mainHospitalCoordinates.length === 2 &&
                    similarHospitalCoordinates.length === 2
                      ? calculateDistance(
                          mainHospitalCoordinates[0],
                          mainHospitalCoordinates[1],
                          similarHospitalCoordinates[0],
                          similarHospitalCoordinates[1]
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
      </div>
    );
  };

  const getPostalTown = (postcode) => {
    const postcodeEntry = postcodeData[postcode];
    return postcodeEntry
      ? postcodeEntry.postaltown !== "0"
        ? postcodeEntry.postaltown
        : ""
      : "";
  };

  const getCounty = (postcode) => {
    const postcodeEntry = postcodeData[postcode];
    return postcodeEntry
      ? postcodeEntry.County !== "0"
        ? postcodeEntry.County
        : ""
      : "";
  };

  const formatPostcode = (postcode) => {
    return postcode.substring(Math.max(postcode.length - 5, 0));
  };

  const checkIntraInter = (Cluster_ID, county) => {
    let intra = false;
    let inter = false;
    const counties = new Set();

    const sameCluster_IDData = filteredData.filter((item) => item.properties.Cluster_ID === Cluster_ID);

    sameCluster_IDData.forEach((item) => {
      const itemCounty = getCounty(item.properties.PostCode);
      if (itemCounty === county) {
        if (
          !intra &&
          sameCluster_IDData.filter((i) => getCounty(i.properties.PostCode) === county)
            .length > 1
        ) {
          intra = true;
        }
      } else {
        inter = true;
      }
      counties.add(itemCounty);
    });

    return { intra, inter };
  };

  const severityBodyTemplate = (rowData) => {
    const date = new Date(rowData.properties.Date);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    const Cluster_ID = rowData.properties.Cluster_ID;
    const county = getCounty(rowData.properties.PostCode);
    const { intra, inter } = checkIntraInter(Cluster_ID, county);

    return (
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {diffDays < 7 && (
          <Tag
            value="New"
            className="tag-new"
            data-pr-tooltip="Newly reported (within 7 days)"
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

  const postalTownBodyTemplate = (rowData) => {
    return getPostalTown(rowData.properties.PostCode);
  };

  const countyBodyTemplate = (rowData) => {
    return getCounty(rowData.properties.PostCode);
  };

  const postcodeBodyTemplate = (rowData) => {
    return formatPostcode(rowData.properties.PostCode);
  };

  const hospitalBodyTemplate = (rowData) => {
    return rowData.properties.Hospital;
  };

  const analysisProfileBodyTemplate = (rowData) => {
    return (
      <span style={{ fontStyle: "italic" }}>
        {rowData.properties.analysis_profile.replace(/_/g, " ")}
      </span>
    );
  };

  const handlePageChange = (event) => {
    setFirst(event.first);
    setRows(event.rows);
  };

  const header = (
    <div className="flex align-items-center justify-content-end gap-2">
      <ExportButton data={filteredData} fileName="table_data" />
    </div>
  );

  const footer = `${filteredData ? filteredData.length : 0} Records.`;

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
          body={analysisProfileBodyTemplate}
          sortable
        />
        <Column field="properties.Cluster_ID" header="Cluster_ID" sortable />
        <Column
          field="properties.Date"
          header="Date"
          sortable
          sortField="properties.Date"
          sortOrder={-1}
        />
        <Column header="Postcode" body={postcodeBodyTemplate} sortable />
        <Column header="Postal Town" body={postalTownBodyTemplate} sortable />
        <Column header="County" body={countyBodyTemplate} sortable />
        <Column header="Hospital" body={hospitalBodyTemplate} sortable />
        <Column header="" body={severityBodyTemplate} />
      </DataTable>
      <Tooltip
        ref={tooltipRef}
        target=".tag-new, .tag-intra, .tag-inter"
        position="bottom"
      />
    </div>
  );
};

export default Table;

