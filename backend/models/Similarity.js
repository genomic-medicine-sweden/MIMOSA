const mongoose = require("mongoose");

const similaritySchema = new mongoose.Schema({
  ID: { type: String, required: true },
  similar: [
    {
      ID: { type: String },
      similarity: { type: Number }
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

const Similarity = mongoose.model("Similarity", similaritySchema, "similarities");

module.exports = Similarity;

