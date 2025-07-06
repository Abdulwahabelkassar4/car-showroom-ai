const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { isAdmin } = require('../../middleware/adminAuth');

// GET: Show add car form
router.get('/add-car', isAdmin, async (req, res) => {
    try {
        res.render('admin/add-car', { 
            user: req.session.user,
        });
    } catch (error) {
        res.render('admin/add-car', { 
            user: req.session.user,
        });
    }
});

// POST: Handle car addition
router.post('/add-car', isAdmin, async (req, res) => {
    try {
        const {
            make, model, year, trim, body_style, transmission,
            state, condition, odometer, color, interior,
            price, description, image
        } = req.body;

        // Validate required fields
        if (!make || !model || !year || !price) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Insert into cars table
        const [result] = await db.query(`
  INSERT INTO cars (
    make, model, year, trim, body_style, transmission,
    state, \`condition\`, odometer, color, interior,
    price, image, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
`, [
  make, model, year, trim, body_style, transmission,
  state, condition, odometer, color, interior,
  price, image
]);

// Then insert the description into the `car_descriptions` table
await db.query(`
  INSERT INTO car_descriptions (car_id, description)
  VALUES (?, ?)
`, [result.insertId, description]);

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.json({
                success: true,
                message: 'Car added successfully',
                carId: result.insertId
            });
        } else {
            res.redirect('/admin/manage-cars');
        }
    } catch (error) {
        console.error('Error adding car:', error);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.status(500).json({
                success: false,
                error: 'Error adding car'
            });
        } else {
            res.status(500).send('Error adding car');
        }
    }
});

module.exports = router;
