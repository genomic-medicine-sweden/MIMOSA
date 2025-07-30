import domtoimage from "dom-to-image";

export const exportElementAsPng = (element, filenamePrefix = "MIMOSA") => {
  if (!element) return;

  domtoimage
    .toPng(element, { quality: 1.0, bgcolor: null })
    .then((dataUrl) => {
      const today = new Date();
      const formattedDate = today.toISOString().split("T")[0].replace(/-/g, "");
      const fileName = `${filenamePrefix}_${formattedDate}.png`;

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      link.click();
    })
    .catch((err) => {
      console.error("Error exporting image:", err);
    });
};
