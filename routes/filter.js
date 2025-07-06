const express = require('express');

module.exports = function (pool) {
  const router = express.Router();

  router.get('/filter', async (req, res) => {
    try {
      const [makes] = await pool.query('SELECT DISTINCT make FROM cars');
      const [body_style] = await pool.query('SELECT DISTINCT body_style FROM cars');
      const [colors] = await pool.query('SELECT DISTINCT color FROM cars');
      const [transmissions] = await pool.query('SELECT DISTINCT transmission FROM cars');
      const [conditions] = await pool.query('SELECT DISTINCT `condition` FROM cars');

      // Build dynamic WHERE clause
      const filters = [];
      const values = [];

      if (req.query.make) {
        filters.push('make = ?');
        values.push(req.query.make);
      }
      if (req.query.body_style) {
        filters.push('body_style = ?');
        values.push(req.query.body_style);
      }
      if (req.query.color) {  // Notice we check req.query.color now
        filters.push('color = ?');
        values.push(req.query.color);
      }
      if (req.query.transmission) {
        filters.push('transmission = ?');
        values.push(req.query.transmission);
      }
      if (req.query.condition) {
        filters.push('`condition` = ?');
        values.push(req.query.condition);
      }
      if (req.query.min_price) {
        filters.push('price >= ?');
        values.push(Number(req.query.min_price));
      }
      if (req.query.max_price) {
        filters.push('price <= ?');
        values.push(Number(req.query.max_price));
      }

      let query = 'SELECT * FROM cars';
      if (filters.length > 0) {
        query += ' WHERE ' + filters.join(' AND ');
      }

      const [cars] = await pool.query(query, values);

      // Pass the req.query as "query" to the template
      res.render('filter', {
        cars,
        body_style,
        makes,
        colors,
        transmissions,
        conditions,
        query: req.query
      });

    } catch (err) {
      console.error('Error in /filter route:', err);
      res.render('filter', {
        cars: [],
        body_style: [],
        makes: [],
        colors: [],
        transmissions: [],
        conditions: [],
        query: {}
      });
    }
  });

  return router;
};
