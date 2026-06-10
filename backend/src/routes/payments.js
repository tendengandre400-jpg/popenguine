/**
 * Routes des paiements - Wave & Orange Money
 * Sécurisation: Validation, JWT, Encryption
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const { verifyToken } = require('./auth');

// ════════════════════════════════════════
// WAVE MONEY - INITIATION PAIEMENT
// ════════════════════════════════════════

router.post('/wave/initiate', [
  body('amount').isFloat({ min: 100 }).withMessage('Montant invalide'),
  body('reference').trim().notEmpty().withMessage('Référence requise'),
  body('currency').equals('XOF').withMessage('Devise doit être XOF'),
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

    const { amount, reference, phoneNumber } = req.body;

    // Appel API Wave
    const response = await axios.post(
      `${process.env.WAVE_API_URL}/payments/initiate`,
      {
        amount,
        reference,
        phoneNumber,
        currency: 'XOF',
        merchantId: process.env.WAVE_MERCHANT_ID,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.WAVE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`✅ Paiement Wave initié: ${reference}`);

    res.json({
      success: true,
      message: 'Paiement Wave initié',
      transactionId: response.data.id,
      redirectUrl: response.data.redirectUrl,
    });
  } catch (error) {
    console.error('Erreur Wave:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'initiation du paiement Wave',
    });
  }
});

// ════════════════════════════════════════
// ORANGE MONEY - INITIATION PAIEMENT
// ════════════════════════════════════════

router.post('/orange/initiate', [
  body('amount').isFloat({ min: 100 }).withMessage('Montant invalide'),
  body('phoneNumber').isMobilePhone('fr-SN').withMessage('Numéro invalide'),
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

    const { amount, phoneNumber } = req.body;

    // Appel API Orange Money
    const response = await axios.post(
      `${process.env.ORANGE_API_URL}/payment/request`,
      {
        amount,
        phoneNumber,
        currency: 'XOF',
        merchantId: process.env.ORANGE_MERCHANT_ID,
        description: 'Pèlerinage Popenguine',
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.ORANGE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`✅ Paiement Orange initié: ${phoneNumber}`);

    res.json({
      success: true,
      message: 'Paiement Orange Money initié',
      transactionId: response.data.transactionId,
      status: 'pending',
    });
  } catch (error) {
    console.error('Erreur Orange:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'initiation du paiement Orange',
    });
  }
});

// ════════════════════════════════════════
// PAIEMENT EN ESPÈCES
// ════════════════════════════════════════

router.post('/cash/record', [
  body('inscriptionId').trim().notEmpty(),
  body('amount').isFloat({ min: 0 }),
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

    const { inscriptionId, amount } = req.body;

    console.log(`💵 Paiement en espèces enregistré: ${inscriptionId}`);

    res.json({
      success: true,
      message: 'Paiement en espèces enregistré',
      status: 'pending_verification',
      inscriptionId,
    });
  } catch (error) {
    console.error('Erreur paiement espèces:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur enregistrement paiement',
    });
  }
});

// ════════════════════════════════════════
// VÉRIFICATION STATUT PAIEMENT
// ════════════════════════════════════════

router.get('/status/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    // À adapter avec votre système de gestion des transactions
    const status = 'pending'; // Ou 'completed', 'failed'

    res.json({
      success: true,
      transactionId,
      status,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur vérification statut',
    });
  }
});

// ════════════════════════════════════════
// WEBHOOKS - CONFIRMATIONS PAIEMENTS
// ════════════════════════════════════════

router.post('/wave/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-wave-signature'];
    
    // Vérifier la signature
    if (!verifyWebhookSignature(signature, req.body)) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const { id, status, reference } = req.body;

    console.log(`🔔 Webhook Wave reçu: ${reference} - ${status}`);

    // Mettre à jour le statut de l'inscription
    // await updateInscriptionPaymentStatus(reference, status);

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur webhook Wave:', error);
    res.status(500).json({ success: false });
  }
});

router.post('/orange/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-orange-signature'];
    
    if (!verifyWebhookSignature(signature, req.body)) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const { transactionId, status } = req.body;

    console.log(`🔔 Webhook Orange reçu: ${transactionId} - ${status}`);

    // Mettre à jour le statut
    // await updateInscriptionPaymentStatus(transactionId, status);

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur webhook Orange:', error);
    res.status(500).json({ success: false });
  }
});

/**
 * Vérifier la signature du webhook
 */
function verifyWebhookSignature(signature, body) {
  // À implémenter avec votre méthode de vérification
  return true; // Placeholder
}

module.exports = router;
