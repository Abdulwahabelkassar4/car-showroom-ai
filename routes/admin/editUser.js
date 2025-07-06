const express = require('express');
const router = express.Router();
const pool = require('../../config/db');

// Load user by ID
router.get('/edit-user/:id', async (req, res) => {
  const userId = req.params.id;
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
  const user = rows[0];

  res.render('admin/edit-user', { user });
});

// Update user data
router.post('/update-user/:id', async (req, res) => {
  const userId = req.params.id;
  const { name, email, role, address } = req.body;

  await pool.query(
    'UPDATE users SET name = ?, email = ?, role = ?, address = ? WHERE id = ?',
    [name, email, role, address, userId]
  );

  res.redirect('/admin/manage-users');
});

module.exports = router;
