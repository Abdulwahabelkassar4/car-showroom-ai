const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/db');

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Check if email and password are provided
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Save session
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        res.json({ 
            success: true, 
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login' });
    }
});

/**
 * POST /api/register
 * Receives name, email, password, address
 * Stores signup data in session, sends OTP, and prompts verification
 */
router.post('/register', async (req, res) => {
  const { name, email, password, address } = req.body;
  if (!name || !email || !password || !address) {
    return res.status(400).json({ success: false, error: 'All fields are required.' });
  }
  try {
    // Prevent duplicate registration
    const [exists] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length) {
      return res.json({ success: false, error: 'Email already registered.' });
    }
    // Save user data in session until verification
    req.session.tempSignup = { name, email, password, address };
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    // Store OTP
    await db.query(
      `INSERT INTO email_otps (email, otp_code, purpose, related_id, expires_at)
       VALUES (?, ?, 'signup', 0, ?)`,
      [email, otp, expiresAt]
    );
    // Send OTP email
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 587, secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    try {
  await transporter.sendMail({
    from: `"hotWheels.Co" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your Email – Signup Code',
    text: `Your verification code is ${otp}. It expires in 10 minutes.`,
  });
  console.log('✅ OTP email sent to:', email);
} catch (err) {
  console.error('❌ Failed to send OTP email:', err);
}
    // Prompt front-end to redirect
    res.json({ success: true, redirect: `/verify-signup?email=${encodeURIComponent(email)}` });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: 'Server error during registration.' });
  }
});

/**
 * GET /verify-signup
 * Renders OTP entry form
 */
router.get('/verify-signup', (req, res) => {
  const { email } = req.query;
  // Ensure matching session data
  if (!req.session.tempSignup || req.session.tempSignup.email !== email) {
    return res.redirect('/register');
  }
  res.render('verify-signup', { email, error: null });
});

/**
 * POST /verify-signup
 * Validates OTP and inserts verified user
 */
router.post('/verify-signup', async (req, res) => {
  const { email, otp } = req.body;
  const signupData = req.session.tempSignup;
  if (!signupData || signupData.email !== email) {
    return res.redirect('/register');
  }
  try {
    const [rows] = await db.query(
      `SELECT id, otp_code, expires_at, attempts
       FROM email_otps
       WHERE email = ? AND purpose = 'signup'
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    );
    if (!rows.length) {
      return res.render('verify-signup', { email, error: 'No code found. Please register again.' });
    }
    const row = rows[0];
    // Check attempt limit
    if (row.attempts >= 5) {
      return res.render('verify-signup', { email, error: 'Too many attempts. Restart signup.' });
    }
    // Validate OTP
    if (row.otp_code !== otp || new Date(row.expires_at) < new Date()) {
      await db.query('UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?', [row.id]);
      return res.render('verify-signup', { email, error: 'Incorrect or expired code.' });
    }
    // OTP valid: insert user
    const { name, password, address } = signupData;
    const hashedPassword = await bcrypt.hash(password, 10);
await db.query(
  `INSERT INTO users (name, email, password, address, verified)
   VALUES (?, ?, ?, ?, 1)`,
  [name, email, hashedPassword, address]
);

    // Cleanup
    delete req.session.tempSignup;
    await db.query('DELETE FROM email_otps WHERE email = ? AND purpose = "signup"', [email]);
return res.redirect('/login');  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).render('verify-signup', { email, error: 'Server error. Please try again.' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Error during logout');
    }
    // clear the session cookie (name might differ)
    res.clearCookie('connect.sid');
    // redirect back to home
    res.redirect('/');
  });
});


router.get('/check-auth', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ 
            authenticated: true, 
            user: req.session.user 
        });
    } else {
        res.json({ authenticated: false });
    }
});

module.exports = router;
