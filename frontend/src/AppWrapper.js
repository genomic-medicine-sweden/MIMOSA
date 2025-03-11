import React, { useEffect, useState } from "react";
import App from "./App";
import config from "./config.json";
import { countOccurrences, getColor } from "./ColorAssignment";

const POLLING_INTERVAL = 5000; //every 5 seconds 

const AppWrapper = () => {
  const [data, setData] = useState(null);
  const [similarity, setSimilarity] = useState(null);
  const [dateRange, setDateRange] = useState(null);

  useEffect(() => {
    let intervalId;

    const fetchData = async () => {
      try {
        const featuresResponse = await fetch(`${config.API_URL}/api/features`);
        const loadedFeatures = await featuresResponse.json();

        const similarityResponse = await fetch(`${config.API_URL}/api/similarity`);
        const loadedSimilarity = await similarityResponse.json();

        const clusteringResponse = await fetch(`${config.API_URL}/api/clustering`);
        let clusteringData = await clusteringResponse.json();

        if (!Array.isArray(clusteringData)) {
          clusteringData = [clusteringData];
        }


        let selectedMapping = null;
        if (clusteringData.length > 0) {
          if (dateRange && Array.isArray(dateRange) && dateRange[0]) {
            let referenceDate;
            if (dateRange.length === 2 && dateRange[1]) {
              referenceDate = new Date(dateRange[1]);
            } else {
              referenceDate = new Date(dateRange[0]);
            }
            referenceDate.setHours(0, 0, 0, 0);
            const candidates = clusteringData.filter(doc => {
              const mappingDate = new Date(doc.createdAt);
              mappingDate.setHours(0, 0, 0, 0);
              return mappingDate <= referenceDate;
            });
            if (candidates.length > 0) {
              selectedMapping = candidates.reduce((prev, curr) =>
                new Date(curr.createdAt) > new Date(prev.createdAt) ? curr : prev
              );
            } else {
              selectedMapping = clusteringData[0];
            }
          } else {
            selectedMapping = clusteringData.reduce((prev, curr) =>
              new Date(curr.createdAt) > new Date(prev.createdAt) ? curr : prev
            );
          }
        }

        const clusteringMapping = {};
        if (selectedMapping && selectedMapping.results) {
          selectedMapping.results.forEach(item => {
            clusteringMapping[item.ID] = item.Cluster_ID;
          });
        }

        const processedData = loadedFeatures.map(item => {
          const featureID = item.properties.ID;
          const resolvedClusterID =
            clusteringMapping[featureID] || item.properties.Cluster_ID || "Unknown";
          item.properties.Cluster_ID = resolvedClusterID;
          return {
            ...item,
            clusterID: resolvedClusterID,
            color: getColor(resolvedClusterID, item.properties.analysis_profile),
          };
        });
        countOccurrences(processedData);

        setData(processedData);
        setSimilarity(loadedSimilarity);
      } catch (error) {
        console.error("Error loading data or similarity:", error);
      }
    };

  
    fetchData();

   
    intervalId = setInterval(fetchData, POLLING_INTERVAL);

    return () => clearInterval(intervalId); 
  }, [dateRange]);

  return (
    <App
      data={data}
      similarity={similarity}
      dateRange={dateRange}
      setDateRange={setDateRange}
    />
  );
};

export default AppWrapper;

