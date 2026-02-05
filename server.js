require(`dotenv`).config();
const express = require(`express`);
const mongoose = require(`mongoose`);
const app = express();
const port = process.env.PORT || 3001;
const mongoURI = process.env.MONGO_URI;
const path = require(`path`);
const cors = require(`cors`);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const authRoutes = require(`./src/routes/authRoutes`);
const userRoutes = require('./src/routes/userRoutes');
const habitRoutes = require('./src/routes/habitRoutes');
const reminderRoutes = require("./src/routes/reminderRoutes");
const statsRoutes = require("./src/routes/statsRoutes");
const tagRoutes = require('./src/routes/tagRoutes'); 

app.use(`/api/auth`, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/habits', habitRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/stats", statsRoutes);
app.use('/api/tags', tagRoutes); 

app.use(express.static(path.join(__dirname, '/public')));
app.use(express.static(path.join(__dirname, 'views')));

app.get(`/`, (req, res) => 
    res.sendFile(path.join(__dirname + '/views/index.html')));


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