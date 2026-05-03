/**
 * Chat Routes
 * 
 * All routes are protected by auth middleware.
 * 
 * POST   /api/chat              — Create new chat
 * GET    /api/chats             — List all user chats
 * GET    /api/chat/:id          — Get chat + messages
 * DELETE /api/chat/:id          — Delete chat
 * PATCH  /api/chat/:id          — Rename chat
 * POST   /api/chat/:id/message  — Send message (SSE streaming response)
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');

// Configure multer for PDF uploads (in-memory storage, 10MB limit)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDFs are allowed'));
    }
  }
});

// All chat routes require authentication
router.use(authMiddleware);

router.post('/chat', chatController.createChat);
router.get('/chats', chatController.getChats);
router.get('/chat/:id', chatController.getChatById);
router.delete('/chat/:id', chatController.deleteChat);
router.patch('/chat/:id', chatController.renameChat);
router.post('/chat/:id/message', chatController.sendMessage);

// New endpoint for PDF extraction
router.post('/upload-pdf', upload.single('pdf'), chatController.uploadPdf);

module.exports = router;
