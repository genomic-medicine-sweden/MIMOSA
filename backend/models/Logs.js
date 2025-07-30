const mongoose = require('mongoose');

const updateEntrySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  updated_fields: [String],
  changes: mongoose.Schema.Types.Mixed // a nested object { field: { old, new } }
});

const logSchema = new mongoose.Schema({
  sample_id: { type: String, required: true, index: true },
  profile: { type: String, required: true },
  added_at: { type: Date, required: true },
  updates: [updateEntrySchema]
});

module.exports = mongoose.model("Log", logSchema, "logs");

