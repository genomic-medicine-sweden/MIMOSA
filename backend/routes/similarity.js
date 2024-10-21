const express = require("express");
const router = express.Router();
const Similarity = require("../models/Similarity"); 


router.get("/", async (req, res) => {
  try {
    const similarities = await Similarity.find({}); 
    res.json(similarities); 
  } catch (err) {
    console.error("Error fetching similarity data from MongoDB:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

