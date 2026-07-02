import domtoimage from "dom-to-image";

const EXPORT_SCALE = 3;

export const exportElementAsPng = (element, filenamePrefix = "MIMOSA") => {
  if (!element) return;

  const width = element.offsetWidth;
  const height = element.offsetHeight;

  domtoimage
    .toPng(element, {
      bgcolor: null,
      width: width * EXPORT_SCALE,
      height: height * EXPORT_SCALE,
      style: {
        transform: `scale(${EXPORT_SCALE})`,
        transformOrigin: "top left",
        width: `${width}px`,
        height: `${height}px`,
      },
    })
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
