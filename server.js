require(`dotenv`).config();
const express = require(`express`);
const mongoose = require(`mongoose`);
const app = express();
const port = process.env.PORT || 5000;
const mongoURI = process.env.MONGO_URI;
const path = require(`path`);
const cors = require(`cors`);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '/public')));
app.use(express.static(path.join(__dirname, 'views')));

const authRoutes = require(`./src/routes/authRoutes`);
app.use(`/api/auth`, authRoutes);

const userRoutes = require('./src/routes/userRoutes');
app.use('/api/users', userRoutes);

const habitRoutes = require('./src/routes/habitRoutes');
app.use('/api', habitRoutes);

const reminderRoutes = require("./src/routes/reminder.routes");
app.use("/api", reminderRoutes);

const statsRoutes = require("./src/routes/stats.routes");
app.use("/api", statsRoutes);


app.use((err, req, res, next) => {
  console.error(err); 
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || "Internal server error",
  });
});

mongoose.connect(mongoURI, { dbName: "habit-tracker" })
  .then(() => {
    console.log("Connected to MongoDB: habit-tracker");
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
  });