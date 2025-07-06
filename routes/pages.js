const express = require('express');
const router = express.Router();

// GET /contactUs - Show the form
router.get('/contactUs', (req, res) => {
  res.render('contactUs'); // contactUs.ejs must exist in /views
});

router.get('/about', (req, res) => {
  res.render('about');
});



router.get('/register', (req, res) => {
  res.render('register');
});
router.get('/login', (req, res) => {
  res.render('login');
});

module.exports = router;
