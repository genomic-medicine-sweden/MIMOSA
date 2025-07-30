const express = require("express");
const router = express.Router();
const Log = require("../models/Logs");

// GET all logs
router.get("/", async (req, res) => {
  try {
    const logs = await Log.find({}).sort({ added_at: 1 });
    res.json(logs);
  } catch (err) {
    console.error("Error fetching logs:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET log for a specific sample_id
router.get("/:sample_id", async (req, res) => {
  try {
    const log = await Log.findOne({ sample_id: req.params.sample_id });
    if (!log) return res.status(404).json({ error: "Sample not found" });
    res.json(log);
  } catch (err) {
    console.error("Error fetching sample log:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

