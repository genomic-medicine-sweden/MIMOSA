const mongoose = require('mongoose');

const clusteringResultSchema = new mongoose.Schema({
  results: [{
    ID: { type: String, required: true },
    Cluster_ID: { type: String, required: true },
    Partition: { type: String, required: true }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Clustering", clusteringResultSchema, "clustering");

