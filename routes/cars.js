const express = require('express');

module.exports = function (pool) {
  const router = express.Router();

  router.get('/cars', async (req, res) => {
    console.log('🔥 /api/cars route hit');
    try {
      const [rows] = await pool.query('SELECT * FROM cars');
      res.json(rows);
    } catch (err) {
      console.error('Error in /cars route:', err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  router.get('/cars/:id/data', async (req, res) => {
    const id = req.params.id;
    try {
      const [rows] = await pool.query(`
        SELECT cars.*, description.content AS description 
        FROM cars 
        LEFT JOIN description ON cars.id = description.car_id 
        WHERE cars.id = ?
      `, [id]);

      if (!rows.length) return res.status(404).json({ error: 'Car not found' });
      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Get full car details by ID
router.get('/cars/:id', async (req, res) => {
  const carId = req.params.id;

  try {
const [rows] = await pool.query('SELECT * FROM cars WHERE id = ?', [carId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching car:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

  return router;
};
