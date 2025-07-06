const express = require('express');
const router = express.Router();
// Make sure this path is correct for your db connection setup
const db = require('../config/db'); // Or use the pool passed in if using the factory pattern

// Assuming this router is mounted at '/api' in your main server file (e.g., app.use('/api', carDescriptionRouter);)
router.get('/car-description/:id', async (req, res) => {
  // Correctly get the 'id' parameter from the URL
  const carId = req.params.id;

  // Basic validation: Check if carId is a number (or fits expected format)
  if (!carId || isNaN(parseInt(carId))) {
      return res.status(400).json({ error: 'Invalid car ID format' });
  }

  try {
    // The query joins car_descriptions and cars based on the car's ID.
    // It correctly uses c.id (from the cars table) in the WHERE clause.
    const [rows] = await db.query(`
      SELECT d.description, c.image, s.sold
      FROM car_descriptions d
      JOIN cars c ON d.car_id = c.id
      LEFT JOIN sales s ON c.id = s.car_id
      WHERE c.id = ?

    `, [carId]); // Use the carId from the URL against c.id

    if (rows.length === 0) {
      // This is a valid request, but the specific car ID wasn't found in the DB
      // It's better practice to return 404 here than in the catch block for "not found"
      return res.status(404).json({ error: 'Car description not found for the given ID' });
    }

    // Send the first (and should be only) result
    res.json(rows[0]);

  } catch (err) {
    console.error(`Error fetching car description for ID ${carId}:`, err);
    // Generic server error for database issues or unexpected problems
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;