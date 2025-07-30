import domtoimage from "dom-to-image";
import { saveAs } from "file-saver";

export const exportTimelineImage = async (chartRef) => {
  try {
    const node = chartRef.current;

    domtoimage
      .toBlob(node) 
      .then((blob) => {
        const date = new Date();
        const formattedDate = date
          .toISOString()
          .split("T")[0]
          .replace(/-/g, "");
        const fileName = `MIMOSA_Timeline_${formattedDate}.png`;

        saveAs(blob, fileName);
      })
      .catch((error) => {
        console.error("Error exporting timeline image:", error);
      });
  } catch (error) {
    console.error("Error exporting timeline image:", error);
  }
};

