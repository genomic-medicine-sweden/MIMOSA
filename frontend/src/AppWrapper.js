import React, { useEffect, useState } from "react";
import App from "./App";
import config from './config.json';
import { countOccurrences, getColor } from './ColorAssignment'; 

const AppWrapper = () => {
  const [data, setData] = useState(null);
  const [similarity, setSimilarity] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchDataResponse = await fetch(`${config.API_URL}/api/features`);
        const loadedData = await fetchDataResponse.json();

        const fetchSimilarityResponse = await fetch(`${config.API_URL}/api/similarity`);
        const loadedSimilarity = await fetchSimilarityResponse.json();

        countOccurrences(loadedData);

 
        const processedData = loadedData.map(item => ({
          ...item,
          color: getColor(item.properties.ST)
        }));

        setData(processedData); 
        setSimilarity(loadedSimilarity);
      } catch (error) {
        console.error("Error loading data or similarity:", error);
      }
    };

    fetchData();
  }, []);

  return <App data={data} similarity={similarity} />;
};

export default AppWrapper;

