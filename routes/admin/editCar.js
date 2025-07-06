const express = require('express');
const router = express.Router();
const pool = require('../../config/db'); // adjust if your DB file is elsewhere

router.get('/edit-car/:id', async (req, res) => {
    const carId = req.params.id;
    const [carRows] = await pool.query('SELECT * FROM cars WHERE id = ?', [carId]);
    const [demandRows] = await pool.query('SELECT predicted_demand FROM demand_predictions WHERE car_id = ?', [carId]);
    const [descriptionRows] = await pool.query('SELECT description FROM car_descriptions WHERE car_id = ?', [carId]);
    const [imageRows] = await pool.query('SELECT image FROM cars WHERE id = ?', [carId]);
    const car = carRows[0];
    const predictedDemand = demandRows.length > 0 ? demandRows[0].predicted_demand : null;
    car.description = descriptionRows.length > 0 ? descriptionRows[0].description : '';
    car.image = imageRows.length > 0 ? imageRows[0].image : '';
  
    res.render('admin/edit-car', { car, predictedDemand });
  });


  router.post('/update-car/:id', async (req, res) => {
    const carId = req.params.id;
    const {
      year, make, model, trim, body_style, transmission, state,
      condition, odometer, color, interior, price,
      description, predicted_demand, image
    } = req.body;
  
    // Update the cars table including image path
    await pool.query(
      `UPDATE cars 
       SET year=?, make=?, model=?, trim=?, body_style=?, transmission=?, state=?, 
           \`condition\`=?, odometer=?, color=?, interior=?, price=?, image=? 
       WHERE id = ?`,
      [year, make, model, trim, body_style, transmission, state,
       condition, odometer, color, interior, price, image, carId]
    );
  
    // Update or insert description
    try {
      await pool.query(
        `UPDATE car_descriptions SET description = ? WHERE car_id = ?`,
        [description, carId]
      );
    } catch (error) {
      console.error('Error updating description:', error);
    }
  
    // Update or insert demand prediction
    if (predicted_demand) {
      await pool.query(
        `UPDATE demand_predictions SET predicted_demand = ? WHERE car_id = ?`,
        [predicted_demand, carId]
      );
    }
  
    console.log('Description:', description);
  
    res.redirect('/admin/manage-cars');
  });
  
  
  
module.exports = router;