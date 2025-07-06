const express = require('express');
const router = express.Router();
const { isAdmin } = require('../../middleware/adminAuth');
const db = require('../../config/db');

// Dashboard
router.get('/dashboard', isAdmin, async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as totalUsers,
                (SELECT COUNT(*) FROM cars) as totalCars,
                (SELECT COUNT(*) FROM orders) as totalOrders,
                (SELECT COUNT(*) FROM price_predictions) as totalPricePredictions,
                (SELECT COUNT(*) FROM demand_predictions) as totalDemandPredictions
        `);
        
        res.render('admin/dashboard', { stats: stats[0] });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).send('Error loading dashboard');
    }
});

// Manage Users
router.get('/manage-users', isAdmin, async (req, res) => {
    try {
        const [users] = await db.query('SELECT * FROM users ORDER BY id');
        res.render('admin/manage-users', { users });
    } catch (error) {
        console.error('Error loading users:', error);
        res.status(500).send('Error loading users');
    }
});

// Delete User
router.delete('/users/:id', isAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
});

// Manage Cars
router.get('/manage-cars', isAdmin, async (req, res) => {
    try {
        const [cars] = await db.query(`
            SELECT c.*, s.sold, s.sold_date
            FROM cars c
            LEFT JOIN sales s ON c.id = s.car_id
            ORDER BY c.id
          `);
          
        res.render('admin/manage-cars', { cars });
    } catch (error) {
        console.error('Error loading cars:', error);
        res.status(500).send('Error loading cars');
    }
});

// Delete Car
router.delete('/cars/:id', isAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM cars WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting car:', error);
        res.status(500).json({ success: false, error: 'Failed to delete car' });
    }
});

router.get('/control-panel', isAdmin, (req, res) => {
  res.render('admin/control-panel');
});

module.exports = router;

