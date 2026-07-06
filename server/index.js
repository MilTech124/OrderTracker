require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const authRoutes = require('./routes/auth.routes');
const ordersRoutes = require('./routes/orders.routes');
const usersRoutes = require('./routes/users.routes');
const companiesRoutes = require('./routes/companies.routes');
const vehiclesRoutes = require('./routes/vehicles.routes');
const plannedRoutesRoutes = require('./routes/plannedRoutes.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Na Vercel (serverless) łączymy z DB przy każdym żądaniu — db.js cachuje połączenie
// Lokalnie łączymy raz przy starcie serwera
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

const ALLOWED_ORIGINS = [
  process.env.CLIENT_ORIGIN,
  'http://localhost:5173',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Na Vercel frontend i backend są na tym samym domenie — przepuszczamy wszystko
      if (process.env.VERCEL) return cb(null, true);
      if (!origin || ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) {
        cb(null, true);
      } else {
        cb(new Error(`CORS: origin ${origin} nie jest dozwolony`));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/routes', plannedRoutesRoutes);

app.use(errorHandler);

// Lokalnie: uruchom serwer HTTP
// Na Vercel: plik jest importowany jako serverless function, listen() nie potrzebne
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`Server na :${PORT}`));
}

// Vercel importuje ten moduł i używa wyeksportowanego `app`
module.exports = app;
