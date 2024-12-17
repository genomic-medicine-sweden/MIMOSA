import React, { useState, useEffect } from "react";
import postcodeCoordinates from "./assets/postcode-coordinates";
import { MultiSelect } from "primereact/multiselect";
import { FloatLabel } from "primereact/floatlabel";
import "primeicons/primeicons.css";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.css";
import "primeflex/primeflex.css";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import CalendarActions from "./CalendarActions";

const FilteringLogic = ({
  data,
  setFilteredData,
  hospitalView,
  toggleHospitalView,
  selectedCounty,
  countyFilter,
  setCountyFilter,
}) => {
  const [postcodeFilter, setPostcodeFilter] = useState([]);
  const [idFilter, setIdFilter] = useState([]);
  const [hospitalFilter, setHospitalFilter] = useState([]);
  const [STFilter, setSTFilter] = useState([]);
  const [analysisProfileFilter, setAnalysisProfileFilter] = useState(
    "staphylococcus_aureus"
  );
  const [ST, setST] = useState([]);
  const [analysisProfiles, setAnalysisProfiles] = useState([]);
  const [postcodes, setPostcodes] = useState([]);
  const [ids, setIds] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [postalTownFilter, setPostalTownFilter] = useState([]);
  const [postalTowns, setPostalTowns] = useState([]);
  const [counties, setCounties] = useState([]);
  const [dateRange, setDateRange] = useState(null);

  useEffect(() => {
    if (selectedCounty && selectedCounty !== "All") {
      setCountyFilter([selectedCounty]);
    } else {
      setCountyFilter([]);
    }
  }, [selectedCounty,setCountyFilter]);

  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0) {
      setFilteredData([]);
      return;
    }
    const uniquePostcodes = [
      ...new Set(
        data
          .filter(
            (item) => item.properties.analysis_profile === analysisProfileFilter
          )
          .map((item) => item.properties.PostCode)
      ),
    ];

    const uniqueIds = [
      ...new Set(
        data
          .filter(
            (item) => item.properties.analysis_profile === analysisProfileFilter
          )
          .map((item) => item.properties.ID)
      ),
    ];

    const uniqueHospitals = [
      ...new Set(
        data
          .filter(
            (item) => item.properties.analysis_profile === analysisProfileFilter
          )
          .map((item) => item.properties.Hospital)
      ),
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
                .map((coord) => coord.postaltown)
            ),
          ]
        : [...new Set(filteredCoordinates.map((item) => item.postaltown))];

    const counties = [
      ...new Set(filteredCoordinates.map((item) => item.County)),
    ];

    const uniqueST = [
      ...new Set(
        data
          .filter(
            (item) => item.properties.analysis_profile === analysisProfileFilter
          )
          .map((item) => item.properties.ST)
      ),
    ];

    const uniqueAnalysisProfiles = [
      ...new Set(data.map((item) => item.properties.analysis_profile)),
    ];
    setAnalysisProfiles(uniqueAnalysisProfiles);

    setPostcodes(uniquePostcodes);
    setIds(uniqueIds);
    setHospitals(uniqueHospitals);
    setPostalTowns(postalTowns);
    setCounties(counties);
    setST(uniqueST);
    setAnalysisProfiles(uniqueAnalysisProfiles);

    const filtered = data.filter((item) => {
      const itemDate = new Date(item.properties.Date);
      itemDate.setHours(0, 0, 0, 0);

      let meetsCriteria = true;
      const postcode = item.properties.PostCode;

      if (STFilter.length > 0 && !STFilter.includes(item.properties.ST)) {
        meetsCriteria = false;
      }
      if (
        analysisProfileFilter.length > 0 &&
        !analysisProfileFilter.includes(item.properties.analysis_profile)
      ) {
        meetsCriteria = false;
      }
      if (postcodeFilter.length > 0 && !postcodeFilter.includes(postcode)) {
        meetsCriteria = false;
      }
      if (idFilter.length > 0 && !idFilter.includes(item.properties.ID)) {
        meetsCriteria = false;
      }
      if (
        hospitalFilter.length > 0 &&
        !hospitalFilter.includes(item.properties.Hospital)
      ) {
        meetsCriteria = false;
      }
      if (
        postalTownFilter.length > 0 &&
        !postalTownFilter.includes(postcodeCoordinates[postcode]?.postaltown)
      ) {
        meetsCriteria = false;
      }
      if (
        countyFilter.length > 0 &&
        !countyFilter.includes(postcodeCoordinates[postcode]?.County)
      ) {
        meetsCriteria = false;
      }
      if (dateRange) {
        let startDate, endDate;
        if (dateRange.length === 1 || dateRange[1] === null) {
          startDate = new Date(dateRange[0]);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(dateRange[0]);
          endDate.setHours(23, 59, 59, 999);
        } else if (dateRange.length === 2) {
          startDate = new Date(dateRange[0]);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(dateRange[1]);
          endDate.setHours(23, 59, 59, 999);
        }
        if (itemDate < startDate || itemDate > endDate) {
          meetsCriteria = false;
        }
      }

      return meetsCriteria;
    });

    setFilteredData(filtered);
  }, [
    data,
    postcodeFilter,
    idFilter,
    hospitalFilter,
    postalTownFilter,
    countyFilter,
    STFilter,
    analysisProfileFilter,
    dateRange,
    setFilteredData,
  ]);

  const resetFilters = () => {
    setPostcodeFilter([]);
    setIdFilter([]);
    setHospitalFilter([]);
    setPostalTownFilter([]);
    if (!(selectedCounty && selectedCounty !== "All")) {
      setCountyFilter([]);
    }
    setSTFilter([]);
    setDateRange(null);
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
            maxselectedlabels={2}
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
            maxselectedlabels={2}
          />
          <label htmlFor="ms-ids"> IDs</label>
        </FloatLabel>

        <FloatLabel>
          <MultiSelect
            value={STFilter}
            options={ST.map((ST) => ({
              label: ST,
              value: ST,
            }))}
            onChange={(e) => setSTFilter(e.value)}
            placeholder="ST"
            filter={true}
            filterPlaceholder="Search"
            maxselectedlabels={2}
          />
          <label htmlFor="ms-ST"> ST</label>
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
                maxselectedlabels={2}
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
                maxselectedlabels={2}
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
                maxselectedlabels={2}
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
            maxselectedlabels={2}
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
            STFilter.length === 0 &&
            !dateRange
          }
        />
      </div>
    </div>
  );
};

export default FilteringLogic;
