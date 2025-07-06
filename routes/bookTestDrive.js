const express = require('express');
const nodemailer = require('nodemailer');

const router = express.Router();
const db = require('../config/db');
const { isLoggedIn } = require('../middleware/adminAuth'); // reuse your auth middleware

router.get('/book-test-drive/:id', isLoggedIn, async (req, res) => {
  const carId = req.params.id;

  try {
    const [carRows] = await db.query('SELECT * FROM cars WHERE id = ?', [carId]);
    const car = carRows[0];
    if (!car) return res.status(404).send('Car not found');

    res.render('book-test-drive', {
      car,
      user: req.session.user
    });
  } catch (err) {
    console.error('Error loading booking page:', err);
    res.status(500).send('Server error');
  }
});


router.post('/book-test-drive/:id', isLoggedIn, async (req, res) => {
  const carId = req.params.id;
  const userId = req.session.user.id;
  const userEmail = req.session.user.email;
  const { booking_date, booking_time, message } = req.body;

  try {
    // Save booking info temporarily
    req.session.tempBooking = {
      carId,
      userId,
      booking_date,
      booking_time,
      message
    };

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      `INSERT INTO email_otps (email, otp_code, purpose, related_id, expires_at)
       VALUES (?, ?, 'test_drive', ?, ?)`,
      [userEmail, otp, carId, expiresAt]
    );

    // Send OTP
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
      to: userEmail,
      subject: 'Confirm Your Test Drive Booking',
      text: `Your OTP code is ${otp}. It expires in 10 minutes.`,
    });

    res.redirect(`/verify-test-drive/${carId}`);
  } catch (err) {
    console.error('Booking verification failed:', err);
    res.status(500).send('Server error during OTP generation');
  }
});

  router.get('/verify-test-drive/:id', isLoggedIn, async (req, res) => {
  const carId = req.params.id;
  const { email } = req.session.user;

res.render('verify-test-drive', {
  carId,
  email: req.session.user.email || '',
  error: null,
  success: null
});
});


router.post('/verify-test-drive/:id', isLoggedIn, async (req, res) => {
  const carId = req.params.id;
  const { otp } = req.body;
  const userEmail = req.session.user.email;
  const bookingData = req.session.tempBooking;

  if (!bookingData || bookingData.carId != carId) {
    return res.redirect('/');
  }

  try {
    const [rows] = await db.query(`
      SELECT id, otp_code, expires_at, attempts
      FROM email_otps
      WHERE email = ? AND purpose = 'test_drive' AND related_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [userEmail, carId]);

    if (!rows.length) {
      return res.render('verify-test-drive', { carId, email: userEmail, error: 'No OTP found.' });
    }

    const row = rows[0];
    if (row.attempts >= 5) {
      return res.render('verify-test-drive', { carId, email: userEmail, error: 'Too many failed attempts.' });
    }

    if (row.otp_code !== otp || new Date(row.expires_at) < new Date()) {
      await db.query('UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?', [row.id]);
      return res.render('verify-test-drive', { carId, email: userEmail, error: 'Invalid or expired code.' });
    }

    const { userId, booking_date, booking_time, message } = bookingData;

    // Check for duplicate
    const [existing] = await db.query(
      `SELECT * FROM test_drives WHERE car_id = ? AND booking_date = ? AND booking_time = ?`,
      [carId, booking_date, booking_time]
    );

    if (existing.length) {
      return res.send(`
        <p style="color: red; text-align: center;">Time slot already booked.</p>
        <p style="text-align:center;"><a href="/">Return to home</a></p>
      `);
    }

    await db.query(`
      INSERT INTO test_drives (user_id, car_id, booking_date, booking_time, message)
      VALUES (?, ?, ?, ?, ?)`,
      [userId, carId, booking_date, booking_time, message]
    );

    await db.query(`DELETE FROM email_otps WHERE email = ? AND purpose = 'test_drive' AND related_id = ?`, [userEmail, carId]);
    delete req.session.tempBooking;

    res.send(`
      <h2 style="color:gold; text-align:center;">✅ Test Drive Confirmed!</h2>
      <p style="text-align:center;"><a href="/">Return to Home</a></p>
    `);
  } catch (err) {
    console.error('OTP verification failed:', err);
    res.status(500).send('Server error during verification');
  }
});

router.get('/resend-testdrive-otp/:id', isLoggedIn, async (req, res) => {
  const carId = req.params.id;
  const userEmail = req.session.user.email;

  try {
    // 1. Limit to 1 resend every 2 minutes
    const [recent] = await db.query(`
      SELECT 1 FROM email_otps
      WHERE email = ? AND purpose = 'test_drive' AND related_id = ?
        AND created_at >= NOW() - INTERVAL 2 MINUTE
      LIMIT 1
    `, [userEmail, carId]);

    if (recent.length > 0) {
      return res.render('verify-test-drive', {
        carId,
        email: userEmail,
        error: 'Please wait 2 minutes before requesting a new code.'
      });
    }

    // 2. Delete previous OTPs for this purpose
    await db.query(`
      DELETE FROM email_otps
      WHERE email = ? AND purpose = 'test_drive' AND related_id = ?
    `, [userEmail, carId]);

    // 3. Generate and insert new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      `INSERT INTO email_otps (email, otp_code, purpose, related_id, expires_at)
       VALUES (?, ?, 'test_drive', ?, ?)`,
      [userEmail, otp, carId, expiresAt]
    );

    // 4. Send it
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
      subject: 'New Test Drive Verification Code',
      text: `Your new OTP is ${otp}. It expires in 10 minutes.`,
    });

    res.render('verify-test-drive', {
      carId,
      email: userEmail,
      error: null,
      success: 'A new code has been sent to your email.'
    });

  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).render('verify-test-drive', {
      carId,
      email: userEmail,
      error: 'Server error during resend'
    });
  }
});

module.exports = router;
