/**
 * Routes d'authentification - JWT Sécurisé
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

/**
 * POST /api/auth/login
 * Authentification admin avec JWT
 */
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Identifiant requis'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
], async (req, res) => {
  try {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array(),
      });
    }

    const { username, password } = req.body;

    // Vérification des credentials admin
    if (username !== process.env.ADMIN_USERNAME) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects',
      });
    }

    // Vérification du mot de passe
    const passwordMatch = await bcrypt.compare(
      password,
      process.env.ADMIN_PASSWORD_HASH || '$2b$10$placeholder'
    );

    if (!passwordMatch) {
      // Log la tentative échouée
      console.warn(`❌ Tentative de connexion échouée pour: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects',
      });
    }

    // Génération du JWT
    const token = jwt.sign(
      {
        username,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    console.log(`✅ Connexion admin réussie: ${username}`);

    res.json({
      success: true,
      message: 'Authentification réussie',
      token,
      user: {
        username,
        name: 'Administrateur',
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
});

/**
 * POST /api/auth/logout
 * Déconnexion (token invalidé côté frontend)
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Déconnecté avec succès',
  });
});

/**
 * GET /api/auth/verify
 * Vérifier si le token est valide
 */
router.get('/verify', verifyToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

/**
 * Middleware de vérification JWT
 */
function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token manquant',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré',
      });
    }
    res.status(401).json({
      success: false,
      message: 'Token invalide',
    });
  }
}

module.exports = router;
module.exports.verifyToken = verifyToken;
