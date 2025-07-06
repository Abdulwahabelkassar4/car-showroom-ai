const express = require('express');

module.exports = function (pool) {
  const router = express.Router();

  // Home page route
  router.get('/', async (req, res) => {
    try {
        const [cars] = await pool.query(`
            SELECT
              id,
              \`year\`,
              make,
              model,
              trim,
              body_style,
              transmission,
              \`state\`,
              \`condition\`,
              odometer,
              color,
              interior,
              price,
              image,
              DATE_FORMAT(created_at, '%M %Y') AS listed_date
            FROM cars
            ORDER BY created_at DESC
          `);
          

      res.render('home', { cars });
    } catch (err) {
      console.error('Error fetching cars for home:', err);
      res.render('home', { cars: [] });
    }
  });

  return router;
};