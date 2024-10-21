const express = require("express");
const router = express.Router();
const Feature = require("../models/Feature");

router.get("/", async (req, res) => { 
  try {
    const features = await Feature.find({});  
    res.json(features); 
  } catch (err) {
    console.error("Error fetching features from MongoDB:", err); 
    res.status(500).json({ error: "Server error" }); 
  }
});

module.exports = router;

