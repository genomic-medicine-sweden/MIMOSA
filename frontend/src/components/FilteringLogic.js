import React, { useState, useEffect } from "react";
import postcodeCoordinates from "@/assets/postcode-coordinates";
import { MultiSelect } from "primereact/multiselect";
import { FloatLabel } from "primereact/floatlabel";
import "primeicons/primeicons.css";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.css";
import "primeflex/primeflex.css";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import CalendarActions from "@/components/calendar/CalendarActions";

const FilteringLogic = ({
  data,
  setFilteredData,
  hospitalView,
  toggleHospitalView,
  selectedCounty,
  countyFilter,
  setCountyFilter,
  dateRange,
  setDateRange,
}) => {
  const [postcodeFilter, setPostcodeFilter] = useState([]);
  const [idFilter, setIdFilter] = useState([]);
  const [hospitalFilter, setHospitalFilter] = useState([]);
  const [Cluster_IDFilter, setCluster_IDFilter] = useState([]);
  const [analysisProfileFilter, setAnalysisProfileFilter] = useState(
    "staphylococcus_aureus",
  );

  const [Cluster_ID, setCluster_ID] = useState([]);
  const [analysisProfiles, setAnalysisProfiles] = useState([]);
  const [postcodes, setPostcodes] = useState([]);
  const [ids, setIds] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [postalTownFilter, setPostalTownFilter] = useState([]);
  const [postalTowns, setPostalTowns] = useState([]);
  const [counties, setCounties] = useState([]);

  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0) return;

    const uniqueAnalysisProfiles = [
      ...new Set(data.map((item) => item.properties.analysis_profile)),
    ];

    setAnalysisProfiles(uniqueAnalysisProfiles);
  }, [data]);

  useEffect(() => {
    if (selectedCounty && selectedCounty !== "All") {
      setCountyFilter([selectedCounty]);
    } else {
      setCountyFilter([]);
    }
  }, [selectedCounty, setCountyFilter]);

  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0) {
      setFilteredData([]);
      return;
    }

    const profileFilteredData = data.filter(
      (item) => item.properties.analysis_profile === analysisProfileFilter,
    );

    const uniquePostcodes = [
      ...new Set(profileFilteredData.map((item) => item.properties.PostCode)),
    ];

    const uniqueIds = [
      ...new Set(profileFilteredData.map((item) => item.properties.ID)),
    ];

    const uniqueHospitals = [
      ...new Set(profileFilteredData.map((item) => item.properties.Hospital)),
    ];

    const uniqueCluster_ID = [
      ...new Set(profileFilteredData.map((item) => item.properties.Cluster_ID)),
    ];

    const filteredCoordinates = Object.entries(postcodeCoordinates)
      .filter(([postcode]) => uniquePostcodes.includes(postcode))
      .map(([, item]) => item);

    const postalTowns =
      countyFilter.length > 0
        ? [
            ...new Set(
              filteredCoordinates
                .filter((coord) => countyFilter.includes(coord.County))
                .map((coord) => coord.postaltown),
            ),
          ]
        : [...new Set(filteredCoordinates.map((item) => item.postaltown))];

    const counties = [
      ...new Set(filteredCoordinates.map((item) => item.County)),
    ];

    setPostcodes(uniquePostcodes);
    setIds(uniqueIds);
    setHospitals(uniqueHospitals);
    setCluster_ID(uniqueCluster_ID);
    setPostalTowns(postalTowns);
    setCounties(counties);

    const filtered = profileFilteredData.filter((item) => {
      const itemDate = new Date(item.properties.Date);
      itemDate.setHours(0, 0, 0, 0);

      const postcode = item.properties.PostCode;

      if (
        Cluster_IDFilter.length > 0 &&
        !Cluster_IDFilter.includes(item.properties.Cluster_ID)
      )
        return false;

      if (postcodeFilter.length > 0 && !postcodeFilter.includes(postcode))
        return false;

      if (idFilter.length > 0 && !idFilter.includes(item.properties.ID))
        return false;

      if (
        hospitalFilter.length > 0 &&
        !hospitalFilter.includes(item.properties.Hospital)
      )
        return false;

      if (
        postalTownFilter.length > 0 &&
        !postalTownFilter.includes(postcodeCoordinates[postcode]?.postaltown)
      )
        return false;

      if (
        countyFilter.length > 0 &&
        !countyFilter.includes(postcodeCoordinates[postcode]?.County)
      )
        return false;

      if (dateRange) {
        let startDate, endDate;

        if (dateRange.length === 1 || dateRange[1] === null) {
          startDate = new Date(dateRange[0]);
          endDate = new Date(dateRange[0]);
          endDate.setHours(23, 59, 59, 999);
        } else {
          startDate = new Date(dateRange[0]);
          endDate = new Date(dateRange[1]);
          endDate.setHours(23, 59, 59, 999);
        }

        if (itemDate < startDate || itemDate > endDate) return false;
      }

      return true;
    });

    setFilteredData(filtered);
  }, [
    data,
    analysisProfileFilter,
    postcodeFilter,
    idFilter,
    hospitalFilter,
    postalTownFilter,
    countyFilter,
    Cluster_IDFilter,
    dateRange,
    setFilteredData,
  ]);

  const resetFilters = () => {
    setPostcodeFilter([]);
    setIdFilter([]);
    setHospitalFilter([]);
    setPostalTownFilter([]);
    setCluster_IDFilter([]);
    setDateRange(null);

    if (!(selectedCounty && selectedCounty !== "All")) {
      setCountyFilter([]);
    }
  };

  return (
    <div className="card">
      <div className="card flex flex-wrap justify-content-center gap-3">
        <FloatLabel>
          <Dropdown
            value={analysisProfileFilter}
            options={analysisProfiles.map((profile) => ({
              label: profile.replace(/_/g, " "),
              value: profile,
            }))}
            onChange={(e) => setAnalysisProfileFilter(e.value)}
            placeholder="Analysis Profile"
            filter={true}
            filterPlaceholder="Search"
          />
          <label htmlFor="ms-analysisProfileFilter">Analysis Profile</label>
        </FloatLabel>

        <FloatLabel>
          <MultiSelect
            value={idFilter}
            onChange={(e) => setIdFilter(e.value)}
            options={ids.map((id) => ({ label: id, value: id }))}
            optionLabel="label"
            placeholder="Select IDs"
            className="w-full"
            filter={true}
            filterPlaceholder="Search"
            maxSelectedLabels={2}
          />
          <label htmlFor="ms-ids"> IDs</label>
        </FloatLabel>

        <FloatLabel>
          <MultiSelect
            value={Cluster_IDFilter}
            options={Cluster_ID.map((Cluster_ID) => ({
              label: Cluster_ID,
              value: Cluster_ID,
            }))}
            onChange={(e) => setCluster_IDFilter(e.value)}
            placeholder="Cluster_ID"
            filter={true}
            filterPlaceholder="Search"
            maxSelectedLabels={2}
          />
          <label htmlFor="ms-Cluster_ID"> Cluster_ID</label>
        </FloatLabel>

        <FloatLabel>
          <Calendar
            value={dateRange}
            onChange={(e) => setDateRange(e.value)}
            selectionMode="range"
            dateFormat="yy.mm.dd"
            maxDate={new Date()}
            footerTemplate={() => (
              <CalendarActions setDateRange={setDateRange} />
            )}
          />
          <label htmlFor="ms-dateRange">Date Range</label>
        </FloatLabel>

        {!hospitalView && (
          <>
            <FloatLabel>
              <MultiSelect
                value={postcodeFilter}
                options={postcodes.map((postcode) => ({
                  label: postcode.slice(-5),
                  value: postcode,
                }))}
                onChange={(e) => setPostcodeFilter(e.value)}
                placeholder="Postcode"
                filter={true}
                filterPlaceholder="Search"
                maxSelectedLabels={2}
              />
              <label htmlFor="ms-PostCode"> Postcode</label>
            </FloatLabel>

            <FloatLabel>
              <MultiSelect
                value={postalTownFilter}
                options={postalTowns.map((town) => ({
                  label: town,
                  value: town,
                }))}
                onChange={(e) => setPostalTownFilter(e.value)}
                placeholder="Postal Town"
                filter={true}
                filterPlaceholder="Search"
                maxSelectedLabels={2}
              />
              <label htmlFor="ms-postalTownFilter"> Postal Town</label>
            </FloatLabel>

            <FloatLabel>
              <MultiSelect
                value={countyFilter}
                options={counties.map((county) => ({
                  label: county,
                  value: county,
                }))}
                onChange={(e) => setCountyFilter(e.value)}
                placeholder="County"
                filter={true}
                filterPlaceholder="Search"
                maxSelectedLabels={2}
                disabled={selectedCounty && selectedCounty !== "All"}
              />
              <label htmlFor="ms-countyFilter"> County</label>
            </FloatLabel>
          </>
        )}

        <FloatLabel>
          <MultiSelect
            value={hospitalFilter}
            options={hospitals.map((hospital) => ({
              label: hospital,
              value: hospital,
            }))}
            onChange={(e) => setHospitalFilter(e.value)}
            placeholder="Hospital"
            filter={true}
            filterPlaceholder="Search"
            maxSelectedLabels={2}
          />
          <label htmlFor="ms-hospitalFilter"> Hospital</label>
        </FloatLabel>

        <Button
          label={hospitalView ? "Postcode View" : "Hospital View"}
          onClick={toggleHospitalView}
        />
        <Button
          label="Reset Filters"
          onClick={resetFilters}
          disabled={
            postcodeFilter.length === 0 &&
            idFilter.length === 0 &&
            hospitalFilter.length === 0 &&
            postalTownFilter.length === 0 &&
            countyFilter.length === 0 &&
            Cluster_IDFilter.length === 0 &&
            !dateRange
          }
        />
      </div>
    </div>
  );
};

export default FilteringLogic;
