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
// тут будем писать routes
const authRoutes = require('./src/routes/userRoutes');
const productRoutes = require('./src/routes/productRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const cartRoutes = require('./src/routes/cartRoutes');

app.use('/api/cart', cartRoutes);
app.use('/api/categories', categoryRoutes);

app.get(`/`, (req, res) => 
    res.sendFile(path.join(__dirname + '/views/index.html')));

app.use(`/api/auth`, authRoutes);
app.use(`/api/products`, productRoutes);
app.use(`/api/orders`, orderRoutes);
app.use(`/api/admin`, adminRoutes);

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