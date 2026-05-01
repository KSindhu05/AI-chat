/**
 * Auth Routes
 * 
 * POST /api/auth/register — Create new account
 * POST /api/auth/login    — Login and get JWT
 * GET  /api/auth/me       — Get current user (protected)
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
