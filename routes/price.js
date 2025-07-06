const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/adminAuth');
const axios = require('axios');
const pool = require('../config/db');

// GET: Show prediction form (Admin only)
router.get('/predict-price', isAdmin, (req, res) => {
    res.render('admin/predict-price', { 
        user: req.session.user,
        predictedPrice: null 
    });
});

router.post('/predict-price', isAdmin, async (req, res) => {
    try {
        const { isExistingCar, carId, ...inputData } = req.body;

        const response = await axios.post('http://localhost:5000/api/predict-price', inputData);
        const predictedPrice = response.data.predicted_price;

        // Log only if checkbox is checked and carId is provided
        if (isExistingCar === 'on' && carId) {
            await pool.query(
                'INSERT INTO price_predictions (car_id, predicted_price) VALUES (?, ?)',
                [carId, predictedPrice]
            );
        }

        res.render('admin/predict-price', {
            user: req.session.user,
            predictedPrice
        });

    } catch (error) {
        console.error('Price prediction error:', error);
        res.status(500).render('admin/predict-price', {
            user: req.session.user,
            predictedPrice: null,
            error: 'Failed to get prediction'
        });
    }
});



// GET: View prediction history (Admin only)
router.get('/price-predictions', isAdmin, async (req, res) => {
    try {
        const [predictions] = await pool.query(
            'SELECT * FROM price_predictions WHERE user_id = ? ORDER BY created_at DESC',
            [req.session.user.id]
        );
        res.render('admin/price-predictions', { 
            user: req.session.user,
            predictions 
        });
    } catch (error) {
        console.error('Error fetching predictions:', error);
        res.status(500).send('Error fetching prediction history');
    }
});

module.exports = router;
