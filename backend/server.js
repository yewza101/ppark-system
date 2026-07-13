require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const parentRoutes = require('./routes/parent');
const sessionRoutes = require('./routes/sessions');

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/sessions', sessionRoutes);

app.get('/', (req, res) => {
  res.send('Tutoring App API is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
