/**
 * Routes des inscriptions
 * CRUD sécurisé avec validation
 */

const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');

/**
 * POST /api/inscriptions
 * Créer une nouvelle inscription
 */
router.post('/', [
  body('firstName').trim().notEmpty().isLength({ min: 2 }),
  body('lastName').trim().notEmpty().isLength({ min: 2 }),
  body('email').isEmail().normalizeEmail(),
  body('phone').isMobilePhone('fr-SN'),
  body('ceb').trim().notEmpty(),
  body('paymentMethod').isIn(['wave', 'orange', 'cash']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array(),
      });
    }

    const { firstName, lastName, email, phone, ceb, paymentMethod } = req.body;

    // À adapter avec votre modèle MongoDB
    console.log(`✅ Inscription créée: ${firstName} ${lastName}`);

    res.status(201).json({
      success: true,
      message: 'Inscription créée avec succès',
      inscription: {
        id: 'new_id_here',
        firstName,
        lastName,
        email,
        phone,
        ceb,
        paymentMethod,
        status: 'pending_payment',
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Erreur création inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création',
    });
  }
});

/**
 * GET /api/inscriptions
 * Lister les inscriptions (admin seulement)
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending_payment', 'paid', 'cancelled']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Paramètres invalides',
        errors: errors.array(),
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    // À adapter avec votre modèle MongoDB
    const inscriptions = [];
    const total = 0;

    res.json({
      success: true,
      data: inscriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erreur listage inscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du chargement',
    });
  }
});

/**
 * GET /api/inscriptions/:id
 * Détails d'une inscription
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // À adapter avec votre modèle MongoDB
    const inscription = null;

    if (!inscription) {
      return res.status(404).json({
        success: false,
        message: 'Inscription non trouvée',
      });
    }

    res.json({
      success: true,
      data: inscription,
    });
  } catch (error) {
    console.error('Erreur détails inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du chargement',
    });
  }
});

/**
 * PUT /api/inscriptions/:id
 * Mettre à jour une inscription
 */
router.put('/:id', [
  body('firstName').optional().trim().isLength({ min: 2 }),
  body('lastName').optional().trim().isLength({ min: 2 }),
  body('email').optional().isEmail(),
  body('phone').optional().isMobilePhone('fr-SN'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array(),
      });
    }

    const { id } = req.params;

    // À adapter avec votre modèle MongoDB
    console.log(`✏️ Inscription mise à jour: ${id}`);

    res.json({
      success: true,
      message: 'Inscription mise à jour',
    });
  } catch (error) {
    console.error('Erreur mise à jour inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour',
    });
  }
});

/**
 * DELETE /api/inscriptions/:id
 * Supprimer une inscription
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // À adapter avec votre modèle MongoDB
    console.log(`🗑️ Inscription supprimée: ${id}`);

    res.json({
      success: true,
      message: 'Inscription supprimée',
    });
  } catch (error) {
    console.error('Erreur suppression inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression',
    });
  }
});

module.exports = router;
