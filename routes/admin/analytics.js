const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { isAdmin } = require('../../middleware/adminAuth');

router.get('/analytics', isAdmin, async (req, res) => {
  const { start_date, end_date } = req.query;

  // Build WHERE clause for date filtering
  let dateFilter = '';
  const params = [];

  if (start_date) {
    dateFilter += ' AND s.sold_date >= ?';
    params.push(start_date);
  }

  if (end_date) {
    dateFilter += ' AND s.sold_date <= ?';
    params.push(end_date);
  }

  try {
    // 1. Most sold models
    const [topModels] = await db.query(`
      SELECT c.make, c.model, COUNT(*) AS total_sold
      FROM sales s
      JOIN cars c ON s.car_id = c.id
      WHERE s.sold = 1 ${dateFilter}
      GROUP BY c.make, c.model
      ORDER BY total_sold DESC
      LIMIT 5
    `, params);

    // 2. Average price per make
    const [avgPrice] = await db.query(`
      SELECT c.make, ROUND(AVG(c.price), 2) AS avg_price
      FROM sales s
      JOIN cars c ON s.car_id = c.id
      WHERE s.sold = 1 ${dateFilter}
      GROUP BY c.make
      ORDER BY avg_price DESC
    `, params);

    // 3. Monthly sales
    const [monthlySales] = await db.query(`
      SELECT DATE_FORMAT(s.sold_date, '%Y-%m') AS month, COUNT(*) AS sales_count
      FROM sales s
      WHERE s.sold = 1 ${dateFilter}
      GROUP BY month
      ORDER BY month ASC
    `, params);

    res.render('admin/analytics', {
      topModels,
      avgPrice,
      monthlySales,
      query: { start_date, end_date }
    });

  } catch (err) {
    console.error('Analytics query error:', err);
    res.status(500).send('Error generating analytics');
  }
});

module.exports = router;
