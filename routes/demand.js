const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/adminAuth');
const axios = require('axios');
const pool = require('../config/db');

// GET: Show form (Admin only)
router.get('/predict-demand', isAdmin, (req, res) => {
    res.render('admin/predict-demand', { 
        user: req.session.user,
        prediction: null 
    });
});

// POST: handle prediction (Admin only)
router.post('/predict-demand', isAdmin, async (req, res) => {
    try {
        const { isExistingCar, carId, ...inputData } = req.body;
        const response = await axios.post('http://localhost:5000/api/predict-demand', inputData);
        const predictedDemand = response.data.predicted_demand;

        const numericCarId = parseInt(carId);
        if (isExistingCar === 'on' && !isNaN(numericCarId)) {
            await pool.query(
                'INSERT INTO demand_predictions (car_id, predicted_demand) VALUES (?, ?)',
                [numericCarId, predictedDemand]
            );
        }

        res.render('admin/predict-demand', {
            user: req.session.user,
            predictedDemand
        });

    } catch (error) {
        console.error('Demand prediction error:', error);
        res.status(500).render('admin/predict-demand', {
            user: req.session.user,
            predictedDemand: null,
            error: 'Failed to get prediction'
        });
    }
});


// GET: View prediction history (Admin only)
router.get('/demand-predictions', isAdmin, async (req, res) => {
    try {
        const [predictions] = await pool.query(
            'SELECT * FROM demand_predictions WHERE user_id = ? ORDER BY created_at DESC',
            [req.session.user.id]
        );
        res.render('admin/demand-predictions', { 
            user: req.session.user,
            predictions 
        });
    } catch (error) {
        console.error('Error fetching predictions:', error);
        res.status(500).send('Error fetching prediction history');
    }
});

module.exports = router;
