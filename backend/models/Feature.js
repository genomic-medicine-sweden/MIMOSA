const mongoose = require("mongoose");

const featureSchema = new mongoose.Schema({
  type: { type: String, required: true },
  properties: {
    PostCode: String,
    Hospital: String,
    analysis_profile: String,
    Pipeline_Version: String,
    Pipeline_Date: String,
    Date: String,
    ID: String,
    QC_Status: String,
    typing: {
      ST: String,
      alleles: {
        type: Map,
        of: String,
        default: {}
      }
    }
  },
  geometry: {
    type: Object,
    default: { type: "Point", coordinates: [] },
    required: true,
  },
});

const Feature = mongoose.model("Feature", featureSchema);

module.exports = Feature;

