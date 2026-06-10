/**
 * Serveur Express principal - Sécurisé
 * Protection: Helmet, CORS, Rate Limiting, JWT
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const mongoose = require('mongoose');

const app = express();

// ═══════════════════════════════════════
// MIDDLEWARE DE SÉCURITÉ
// ═══════════════════════════════════════

// Helmet - Protection des en-têtes HTTP
app.use(helmet());

// Compression
app.use(compression());

// CORS - Contrôle d'accès cross-origin
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600,
}));

// Rate limiting global
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Trop de requêtes depuis cette adresse IP, réessayez plus tard.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Morgan - Logging des requêtes
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ═══════════════════════════════════════
// BASE DE DONNÉES
// ═══════════════════════════════════════

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
}).then(() => {
  console.log('✅ Connecté à MongoDB');\n}).catch(err => {
  console.error('❌ Erreur MongoDB:', err.message);
  process.exit(1);
});

// ═══════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/inscriptions', require('./routes/inscriptions'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));

// ═══════════════════════════════════════
// GESTION DES ERREURS
// ═══════════════════════════════════════

// 404 - Route non trouvée
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée',
    path: req.path,
  });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('Error:', err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Erreur serveur interne';

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ═══════════════════════════════════════
// DÉMARRAGE DU SERVEUR
// ═══════════════════════════════════════

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🚀 Serveur Popenguine démarré        ║
║  Port: ${PORT}                               ║
║  Mode: ${process.env.NODE_ENV}                         ║
║  Sécurité: ✅ Helmet, CORS, JWT       ║
╚════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM reçu. Arrêt du serveur...');
  server.close(() => {
    console.log('Serveur fermé');
    mongoose.connection.close(false, () => {
      console.log('MongoDB fermé');
      process.exit(0);
    });
  });
});

module.exports = app;
