const express = require('express');
const router  = express.Router();
const db      = require('../../config/db');
const { isAdmin } = require('../../middleware/adminAuth');

router.get('/price-analytics', isAdmin, async (req, res) => {
  const { start_date, end_date } = req.query;
  let where = '';
  const params = [];

  if (start_date) {
    where += ' AND pp.created_at >= ?';
    params.push(start_date);
  }
  if (end_date) {
    where += ' AND pp.created_at <= ?';
    params.push(end_date);
  }

  try {
    // 1. Distribution buckets
    // 1. Distribution
const [distRows] = await db.query(`
  SELECT 
    CASE 
      WHEN predicted_price < 20000 THEN 'Under $20K'
      WHEN predicted_price BETWEEN 20000 AND 30000 THEN '$20K–30K'
      ELSE 'Over $30K'
    END AS range_label,
    COUNT(*) AS count
  FROM price_predictions AS pp
  WHERE 1=1 ${where}
  GROUP BY range_label
`, params);

// 2. Make-wise average
const [makeRows] = await db.query(`
  SELECT c.make, ROUND(AVG(pp.predicted_price), 2) AS avg_price
  FROM price_predictions AS pp
  JOIN cars c ON pp.car_id = c.id
  WHERE 1=1 ${where}
  GROUP BY c.make
  ORDER BY avg_price DESC
`, params);

// 3. Time series
const [timeRows] = await db.query(`
  SELECT DATE(pp.created_at) AS date, AVG(pp.predicted_price) AS avg_price
  FROM price_predictions AS pp
  WHERE 1=1 ${where}
  GROUP BY date
  ORDER BY date ASC
`, params);

    res.render('admin/price-analytics', { distRows, makeRows, timeRows, query: { start_date, end_date } });
  } catch (err) {
    console.error('Price analytics error:', err);
    res.status(500).send('Error generating price analytics');
  }
});

module.exports = router;
