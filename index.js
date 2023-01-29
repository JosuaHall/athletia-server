const express = require("express");
const mongoose = require("mongoose");
const users = require("./routes/api/users");
const auth = require("./routes/api/auth");
const organizations = require("./routes/api/organizations");
const config = require("config");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/public", express.static("public"));

const corsOptions = {
  origin: "https://athletia.onrender.com",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

/*
    origin: ["http://localhost:3000", "https://athletia.onrender.com"],

);*/

const db = config.get("mongoURI");

mongoose
  .connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB Connected..."))
  .catch((err) => console.log(err));

// Use Routes
//app.use("/public", express.static("public"));
app.use("/api/users", users);
app.use("/api/auth", auth);
app.use("/api/organizations", organizations);

const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`Server started on port ${port}`));
