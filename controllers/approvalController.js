require('dotenv').config();
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'ankitsingh07897@gmail.com',
    pass: process.env.EMAIL_PASS || 'elrj uxrl srbk lgoc',
  },
});

const pendingApprovals = new Map();

exports.verifyPdfAccess = (req, res) => {
  const { pdfId, password } = req.body;
  const CORRECT_PASSWORD = 'secret123';

  if (password !== CORRECT_PASSWORD) {
    console.error('Incorrect password attempt:', { pdfId });
    return res.status(401).json({ error: 'Incorrect password' });
  }

  const token = uuidv4();
  pendingApprovals.set(token, { pdfId, userPassword: password, approved: false });
  const API_BASE_URL = 'https://pdf-management-bkct.onrender.com';


  const approvalLink = `${API_BASE_URL}/api/approve/${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER || 'ankitsingh07897@gmail.com',
    to: process.env.EMAIL_USER || 'ankitsingh07897@gmail.com',
    subject: `Click to Approve Access for PDF ID ${pdfId}`,
    html: `
      <h3>File Access Approval Request</h3>
      <p>A user is requesting access to PDF ID <strong>${pdfId}</strong>.</p>
      <p><a href="${approvalLink}">Click here to approve access</a></p>
    `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error.message, error.stack);
      return res.status(500).json({ error: 'Failed to send email' });
    }
    console.log(`Email sent: ${info.response}, Approval link: ${approvalLink}`);
    res.json({ token, message: 'Waiting for approval' });
  });
};

exports.approveAccess = (req, res) => {
  const { token } = req.params;
  const approval = pendingApprovals.get(token);

  if (!approval) {
    console.error('Invalid approval token:', token);
    return res.status(404).sendFile(path.join(__dirname, '../public', 'error.html'));
  }

  approval.approved = true;
  pendingApprovals.set(token, approval);
  console.log(`Approval granted for token: ${token}`);
  res.sendFile(path.join(__dirname, '../public', 'approved.html'));
};

exports.checkApproval = (req, res) => {
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

  res.json({ approved: false });
};