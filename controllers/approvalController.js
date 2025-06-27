require('dotenv').config();
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Validate environment variables
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('Missing EMAIL_USER or EMAIL_PASS in environment variables');
  throw new Error('Email configuration is missing. Please set EMAIL_USER and EMAIL_PASS in .env file.');
}

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Nodemailer configuration error:', error.message, error.stack);
  } else {
    console.log('Nodemailer is ready to send emails');
  }
});

const pendingApprovals = new Map();

exports.verifyPdfAccess = async (req, res) => {
  try {
    const { pdfId, password } = req.body;

    // Validate request body
    if (!pdfId || !password) {
      console.error('Missing pdfId or password in request body:', req.body);
      return res.status(400).json({ error: 'pdfId and password are required' });
    }

    const CORRECT_PASSWORD = 'secret123';
    if (password !== CORRECT_PASSWORD) {
      console.error('Incorrect password attempt:', { pdfId });
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const token = uuidv4();
    pendingApprovals.set(token, { pdfId, userPassword: password, approved: false });

    const API_BASE_URL = process.env.API_BASE_URL || 'https://pdf-management-bkct.onrender.com';
    const approvalLink = `${API_BASE_URL}/api/approve/${token}`;

    const mailOptions = {
      from: `"PDF Vault" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `Click to Approve Access for PDF ID ${pdfId}`,
      html: `
        <h3>File Access Approval Request</h3>
        <p>A user is requesting access to PDF ID <strong>${pdfId}</strong>.</p>
        <p><a href="${approvalLink}">Click here to approve access</a></p>
      `,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.response}, Approval link: ${approvalLink}`);
    return res.json({ token, message: 'Waiting for approval' });
  } catch (error) {
    console.error('Error in verifyPdfAccess:', error.message, error.stack);
    return res.status(500).json({ error: 'Failed to process request. Please try again later.' });
  }
};

exports.approveAccess = (req, res) => {
  try {
    const { token } = req.params;
    const approval = pendingApprovals.get(token);

    if (!approval) {
      console.error('Invalid approval token:', token);
      return res.status(404).sendFile(path.join(__dirname, '../public', 'error.html'));
    }

    approval.approved = true;
    pendingApprovals.set(token, approval);
    console.log(`Approval granted for token: ${token}`);
    return res.sendFile(path.join(__dirname, '../public', 'approved.html'));
  } catch (error) {
    console.error('Error in approveAccess:', error.message, error.stack);
    return res.status(500).sendFile(path.join(__dirname, '../public', 'error.html'));
  }
};

exports.checkApproval = (req, res) => {
  try {
    const { token } = req.params;
    const approval = pendingApprovals.get(token);

    if (!approval) {
      console.error('Invalid or expired approval token:', token);
      return res.status(404).json({ error: 'Invalid or expired token' });
    }

    if (approval.approved) {
      pendingApprovals.delete(token);
      console.log(`Approval confirmed for token: ${token}, pdfId: ${approval.pdfId}`);
      return res.json({ approved: true, pdfId: approval.pdfId });
    }

    return res.json({ approved: false });
  } catch (error) {
    console.error('Error in checkApproval:', error.message, error.stack);
    return res.status(500).json({ error: 'Failed to check approval status' });
  }
};