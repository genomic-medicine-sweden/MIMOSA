const express = require("express");
const router = express.Router();
const ClusteringResult = require("../models/Clustering");

// GET all clustering results (sorted by createdAt ascending)
router.get("/", async (req, res) => {
  try {
    const results = await ClusteringResult.find({}).sort({ createdAt: 1 });
    res.json(results);
  } catch (err) {
    console.error("Error fetching clustering results:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

