const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const db = require('../config/db');
const { isLoggedIn } = require('../middleware/adminAuth');

router.get('/buy/:id', isLoggedIn, async (req, res) => {
  const carId = req.params.id;

  try {
    const [rows] = await db.query(`
      SELECT * FROM cars WHERE id = ?
    `, [carId]);

    const car = rows[0];
    if (!car) return res.status(404).send('Car not found');

    res.render('buy-car', { car, user: req.session.user });

  } catch (err) {
    console.error('Error loading car:', err);
    res.status(500).send('Server error');
  }
});


router.post('/buy/:id', isLoggedIn, async (req, res) => {
  const carId     = req.params.id;
  const userEmail = req.session.user.email;
  const { confirm, notes } = req.body;

  // 1) Confirm checkbox
  if (!confirm) {
    return res.status(400).send('You must confirm your purchase.');
  }

  // 2) Generate OTP & expiry
  const otpCode   = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);  // +10 minutes

  // 3) Store in email_otps
  await db.query(
    `INSERT INTO email_otps (email, otp_code, purpose, related_id, expires_at)
     VALUES (?, ?, 'purchase', ?, ?)`,
    [userEmail, otpCode, carId, expiresAt]
  );

  // 4) Send email via Nodemailer (reuse your existing SMTP config)
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  await transporter.sendMail({
    from: `"hotWheels" <${process.env.EMAIL_USER}>`,
    to:   userEmail,
    subject: 'Your Purchase Verification Code',
    text:    `Your verification code is ${otpCode}. It will expire in 10 minutes.`,
  });

  // 5) Redirect to OTP entry form
  res.redirect(`/buy/${carId}/verify`);
});

router.get('/buy/:id/verify', isLoggedIn, (req, res) => {
  const carId = req.params.id;
res.render('buy-verify', {
  carId,
  email: req.session.user.email || '',
  error: null,
  success: null
});
});

router.post('/buy/:id/verify', isLoggedIn, async (req, res) => {
  const carId     = req.params.id;
  const userId    = req.session.user.id;
  const userEmail = req.session.user.email;
  const { otp }   = req.body;

  try {
    // ✅ 1) Get latest OTP with full fields
    const [rows] = await db.query(
      `SELECT id, otp_code, expires_at, attempts
       FROM email_otps
       WHERE email = ? AND purpose = 'purchase' AND related_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [userEmail, carId]
    );

    if (!rows.length) {
      return res.render('buy-verify', {
        carId,
        error: 'No verification code found. Please resend one and try again.'
      });
    }

    const otpRow = rows[0];

    // ✅ 2) Block if max attempts exceeded
    if (otpRow.attempts >= 5) {
      return res.render('buy-verify', {
        carId,
        error: 'Too many failed attempts. This code is blocked. Please resend a new one.'
      });
    }

    // ✅ 3) Validate code and expiry
    if (otpRow.otp_code !== otp || new Date(otpRow.expires_at) < new Date()) {
      await db.query(
        `UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?`,
        [otpRow.id]
      );

      return res.render('buy-verify', {
        carId,
        error: 'Incorrect or expired code. Please try again.'
      });
    }

    // ✅ 4) Check if car already sold
    const [soldCheck] = await db.query(
      'SELECT sold FROM sales WHERE car_id = ?',
      [carId]
    );
    if (soldCheck.length && soldCheck[0].sold === 1) {
      return res.status(400).send('Sorry, this car is already sold.');
    }

    // ✅ 5) Insert into orders
    await db.query(
      `INSERT INTO orders (user_id, car_id, status, timestamp)
       VALUES (?, ?, 'Confirmed', NOW())`,
      [userId, carId]
    );

    // ✅ 6) Mark as sold in sales
    await db.query(
      `INSERT INTO sales (car_id, sold, sold_date)
       VALUES (?, 1, NOW())
       ON DUPLICATE KEY UPDATE sold = 1, sold_date = NOW()`,
      [carId]
    );

    // ✅ 7) Delete used OTP
    await db.query(
      `DELETE FROM email_otps
       WHERE email = ? AND purpose = 'purchase' AND related_id = ?`,
      [userEmail, carId]
    );

    // ✅ 8) Show success
    res.send(`
      <h2 style="text-align:center; color:gold;">✅ Purchase Confirmed!</h2>
      <p style="text-align:center;">Thank you for your purchase.</p>
      <p style="text-align:center;">
        <a href="/" style="color:gold;">Return to homepage</a>
      </p>
    `);
  } catch (err) {
    console.error('Error during OTP verification and purchase:', err);
    res.status(500).send('Server error while processing your verification.');
  }
});

router.get('/buy/:id/resend-otp', isLoggedIn, async (req, res) => {
  const carId = req.params.id;
  const userEmail = req.session.user.email;

  // 1) Clean expired OTPs
  await db.query(`
    DELETE FROM email_otps
    WHERE expires_at < NOW()
  `);

  // 2) Check if one was sent in the last 5 minutes
  const [recent] = await db.query(`
    SELECT 1 FROM email_otps
    WHERE email = ? AND purpose = 'purchase' AND related_id = ?
      AND created_at >= NOW() - INTERVAL 5 MINUTE
    LIMIT 1
  `, [userEmail, carId]);

  if (recent.length > 0) {
    return res.render('buy-verify', {
      carId,
      error: 'Please wait at least 5 minutes before resending a code.'
    });
  }

  // 3) (Optional) Limit to 3 resends in last 30 min
  const [sentCountRows] = await db.query(`
    SELECT COUNT(*) AS count FROM email_otps
    WHERE email = ? AND purpose = 'purchase' AND related_id = ?
      AND created_at >= NOW() - INTERVAL 30 MINUTE
  `, [userEmail, carId]);

  if (sentCountRows[0].count >= 3) {
    return res.render('buy-verify', {
      carId,
      error: 'Too many resend attempts. Please try again after 30 minutes.'
    });
  }

  // 4) Delete existing OTPs for this car
  await db.query(`
    DELETE FROM email_otps
    WHERE email = ? AND purpose = 'purchase' AND related_id = ?
  `, [userEmail, carId]);

  // 5) Generate and insert new OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await db.query(`
    INSERT INTO email_otps (email, otp_code, purpose, related_id, expires_at)
    VALUES (?, ?, 'purchase', ?, ?)
  `, [userEmail, otpCode, carId, expiresAt]);

  // 6) Send the email
  const transporter = require('nodemailer').createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"hotWheels" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: 'Your new purchase verification code',
    text: `Your new code is ${otpCode}. It will expire in 10 minutes.`,
  });

  // 7) Show success
  res.render('buy-verify', {
    carId,
    error: null,
    success: 'A new code has been sent to your email.'
  });
});


module.exports = router;