const mongoose = require("mongoose");

const similaritySchema = new mongoose.Schema({
  ID: { type: String, required: true },
  similar: [
    {
      ID: { type: String },
      similarity: { type: Number } 
    }
  ]
});

const Similarity = mongoose.model("Similarity", similaritySchema);

module.exports = Similarity;

