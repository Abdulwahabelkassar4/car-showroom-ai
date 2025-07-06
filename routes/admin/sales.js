const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { isAdmin } = require('../../middleware/adminAuth');

router.post('/sales/:id', isAdmin, async (req, res) => {
  const carId = req.params.id;
  const sold = parseInt(req.body.sold, 10);

  try {
    if (sold === 1) {
      await db.query(`
        INSERT INTO sales (car_id, sold, sold_date)
        VALUES (?, 1, NOW())
        ON DUPLICATE KEY UPDATE sold = 1, sold_date = NOW()
      `, [carId]);
    } else {
      await db.query(`
        UPDATE sales SET sold = 0, sold_date = NULL WHERE car_id = ?
      `, [carId]);
    }

    res.redirect('/admin/manage-cars');
  } catch (err) {
    console.error('Sales update error:', err);
    res.status(500).send('Failed to update sale status');
  }
});
// 2. GET route to show and filter sold cars
router.get('/sales', isAdmin, async (req, res) => {
    const {
      make = '',
      body_style = '',
      color = '',
      transmission = '',
      condition = '',
      min_price = '',
      max_price = '',
      start_date = '',
      end_date = '',
      keyword = ''
    } = req.query;
  
    let sql = `
      SELECT c.*, s.sold_date 
      FROM cars c
      JOIN sales s ON c.id = s.car_id
      WHERE s.sold = 1
    `;
    const params = [];
  
    if (make) { sql += ' AND c.make = ?'; params.push(make); }
    if (body_style) { sql += ' AND c.body_style = ?'; params.push(body_style); }
    if (color) { sql += ' AND c.color = ?'; params.push(color); }
    if (transmission) { sql += ' AND c.transmission = ?'; params.push(transmission); }
    if (condition) { sql += ' AND c.condition = ?'; params.push(condition); }
    if (min_price) { sql += ' AND c.price >= ?'; params.push(min_price); }
    if (max_price) { sql += ' AND c.price <= ?'; params.push(max_price); }
    if (start_date) { sql += ' AND s.sold_date >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND s.sold_date <= ?'; params.push(end_date); }
    if (keyword) {
      sql += ' AND (c.make LIKE ? OR c.model LIKE ? OR c.trim LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
  
    try {
      const [cars] = await db.query(sql, params);
      const [makes] = await db.query('SELECT DISTINCT make FROM cars');
      const [bodyStyles] = await db.query('SELECT DISTINCT body_style FROM cars');
      const [colors] = await db.query('SELECT DISTINCT color FROM cars');
      const [transmissions] = await db.query('SELECT DISTINCT transmission FROM cars');
      const [conditions] = await db.query('SELECT DISTINCT `condition` FROM cars');
  
      res.render('admin/sales', {
        cars,
        query: req.query,
        makes,
        body_style: bodyStyles,
        colors,
        transmissions,
        conditions
      });
    } catch (error) {
      console.error('Error loading sold cars:', error);
      res.status(500).send('Server error');
    }
  });

  
module.exports = router;
