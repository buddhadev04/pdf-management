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
    user: 'officialjjunction@gmail.com',
    pass: 'tpmmwlxlksoeiqlx',
  },
});

// Verify transporter configuration on startup
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

    const CORRECT_PASSWORD = process.env.CORRECT_PASSWORD || 'secret123';
    if (password !== CORRECT_PASSWORD) {
      console.error('Incorrect password attempt:', { pdfId, password });
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const token = uuidv4();
    pendingApprovals.set(token, { pdfId, userPassword: password, approved: false, timestamp: Date.now() });

    const API_BASE_URL = process.env.API_BASE_URL || 'https://pdf-management-bkct.onrender.com';
    const approvalLink = `${API_BASE_URL}/approve/${token}`;

    const mailOptions = {
      from: `"PDF Vault" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `Click to Approve Access for PDF ID ${pdfId}`,
      html: `
        <h3>File Access Approval Request</h3>
        <p>A user is requesting access to PDF ID <strong>${pdfId}</strong>.</p>
        <p><a href="${approvalLink}">Click here to approve access</a></p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    };

    // Verify transporter before sending email
    await new Promise((resolve, reject) => {
      transporter.verify((error) => {
        if (error) {
          console.error('Transporter verification failed before sending email:', error.message, error.stack);
          reject(new Error(`Transporter verification failed: ${error.message}`));
        } else {
          console.log('Transporter verified successfully before sending email');
          resolve();
        }
      });
    });

    // Send email with detailed logging
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', {
      response: info.response,
      messageId: info.messageId,
      approvalLink,
      to: mailOptions.to,
      from: mailOptions.from,
    });

    // Clean up old pending approvals (remove entries older than 24 hours)
    const now = Date.now();
    for (const [key, value] of pendingApprovals) {
      if (value.timestamp && now - value.timestamp > 24 * 60 * 60 * 1000) {
        console.log(`Cleaning up expired approval token: ${key}`);
        pendingApprovals.delete(key);
      }
    }

    return res.json({ token, message: 'Waiting for approval' });
  } catch (error) {
    console.error('Error in verifyPdfAccess:', {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
    });
    return res.status(500).json({ error: `Failed to process request: ${error.message}` });
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