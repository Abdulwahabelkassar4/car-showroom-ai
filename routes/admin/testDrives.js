const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { isAdmin } = require('../../middleware/adminAuth');

router.get('/test-drives', isAdmin, async (req, res) => {
  try {
    const [bookings] = await db.query(`
      SELECT td.*, u.name AS user_name, c.make, c.model, c.year
      FROM test_drives td
      JOIN users u ON td.user_id = u.id
      JOIN cars c ON td.car_id = c.id
      ORDER BY td.booking_date, td.booking_time
    `);

    res.render('admin/test-drives', { bookings });
  } catch (err) {
    console.error('Error loading test drives:', err);
    res.status(500).send('Server error');
  }
});
router.post('/test-drives/:id/status', isAdmin, async (req, res) => {
  const testDriveId = req.params.id;
  const { status } = req.body;

  try {
    await db.query('UPDATE test_drives SET status = ? WHERE id = ?', [status, testDriveId]);
    res.redirect('/admin/test-drives');
  } catch (err) {
    console.error('Failed to update status:', err);
    res.status(500).send('Error updating test drive status');
  }
});

module.exports = router;
