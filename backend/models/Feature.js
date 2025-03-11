const mongoose = require("mongoose");

const featureSchema = new mongoose.Schema({
  type: { type: String, required: true },
  properties: {
    PostCode: String,
    Hospital: String,
    analysis_profile: String,
    Date: String,
    ID: String,
    QC_Status: String, 
    ST: String,
    arcC: String,
    aroE: String,
    glpF: String,
    gmk: String,
    pta: String,
    tpi: String,
    yqiL: String,
  },
   geometry: {
    type: Object, 
    default: { type: "Point", coordinates: [] }, 
    required: true, 
  },
});

const Feature = mongoose.model("Feature", featureSchema);

module.exports = Feature;

