const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const featureRoutes = require("./routes/feature");
const similarityRoutes = require("./routes/similarity");
const config = require('./config.json');


const app = express();
const PORT = config.BACKEND_PORT;

app.use(express.json());
app.use(cors());

app.use("/api/features", featureRoutes);
app.use("/api/similarity", similarityRoutes);

mongoose.connect(config.MONGO_URI_DOCKER)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error("Error connecting to MongoDB:", err);
  });

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

