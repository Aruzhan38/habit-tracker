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



app.get(`/`, (req, res) => 
    res.sendFile(path.join(__dirname + '/views/index.html')));

mongoose.connect(mongoURI, { dbName: "habit-tracker" })
  .then(() => {
    console.log(`Connected to MongoDB: habit-tracker`);
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`)
    })
  })
  .catch((err) => {
    console.error(`Failed to connect to MongoDB`, err);
  });