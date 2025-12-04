import HospitalCoordinates from "@/assets/hospital-coordinates";

export const hospitalOptions = [
  { label: "", value: "" },
  ...Object.keys(HospitalCoordinates).map((name) => ({
    label: name,
    value: name,
  })),
];
export const fieldFeaturesMeta = {
  PostCode: { label: "PostCode" },
  Date: { label: "Date" },
  Hospital: { label: "Hospital" },
  SampleID: { label: "Sample" },
};
