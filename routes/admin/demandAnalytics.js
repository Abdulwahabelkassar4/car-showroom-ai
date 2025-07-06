const express = require('express');
const router  = express.Router();
const { isAdmin } = require('../../middleware/adminAuth');
const db      = require('../../config/db');

router.get('/demand-analytics', isAdmin, async (req, res) => {
  const { start_date, end_date } = req.query;
  let where = '';
  const params = [];

  if (start_date) {
    where += ' AND dp.created_at >= ?';
    params.push(start_date);
  }
  if (end_date) {
    where += ' AND dp.created_at <= ?';
    params.push(end_date);
  }

  try {
    // 1. Demand level distribution
    const [distRows] = await db.query(`
      SELECT predicted_demand AS result, COUNT(*) AS count
      FROM demand_predictions AS dp
      WHERE 1=1 ${where}
      GROUP BY predicted_demand
    `, params);

    // 2. Make-wise demand distribution
    const [compRows] = await db.query(`
      SELECT c.make AS company, dp.predicted_demand AS result, COUNT(*) AS count
      FROM demand_predictions AS dp
      JOIN cars c ON dp.car_id = c.id
      WHERE 1=1 ${where}
      GROUP BY c.make, dp.predicted_demand
    `, params);

    // 3. Demand prediction trend
    const [timeRows] = await db.query(`
      SELECT DATE(dp.created_at) AS date, dp.predicted_demand AS result, COUNT(*) AS count
      FROM demand_predictions AS dp
      WHERE 1=1 ${where}
      GROUP BY date, result
      ORDER BY date ASC
    `, params);

    res.render('admin/demand-analytics', { distRows, compRows, timeRows, query: { start_date, end_date } });
  } catch (err) {
    console.error('Demand analytics error:', err);
    res.status(500).send('Error generating demand analytics');
  }
});

module.exports = router;
