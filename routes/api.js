const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileController = require('../controllers/fileController');
const approvalController = require('../controllers/approvalController');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

router.post('/upload', upload.single('file'), fileController.uploadFile);
router.get('/file/:id', fileController.getFile);
router.get('/categories', fileController.getCategories);
router.get('/files/:category', fileController.getFilesByCategory);
router.post('/verify-pdf-access', approvalController.verifyPdfAccess);
router.get('/approve/:token', approvalController.approveAccess);
router.get('/check-approval/:token', approvalController.checkApproval);

module.exports = router;