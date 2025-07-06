require('dotenv').config();      // ← this goes first!

const express = require('express');
const session = require('express-session');
require('dotenv').config();
const path = require('path');
const db = require('./config/db'); // from server.js
const mysql = require('mysql2/promise');
const demandRoute = require('./routes/demand');
const priceRoute = require('./routes/price');
const app = express();


// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Expose the session user to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  res.locals.isAdmin = !!(req.session.user && req.session.user.role === 'admin');
  next();
});

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// API Routes
const carRoutes = require('./routes/cars')(db);
app.use('/api', carRoutes);
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/carDescription'));


app.use('/', require('./routes/auth'));//for rendering verufy sign up as ejs not under api


// Page Routes
const filterRoute = require('./routes/filter')(db);
app.use('/', filterRoute); // handled in filter.js

const homeRoute = require('./routes/home')(db);
app.use('/', homeRoute);

const pagesRoute = require('./routes/pages'); 
app.use('/', pagesRoute);

const contactRoute = require('./routes/contact');
app.use('/', contactRoute);

// Admin Routes - Combine all admin routes
const adminRoutes = require('./routes/admin');
const addCarRoutes = require('./routes/admin/addCar');
const editCarRoutes = require('./routes/admin/editCar');
const editUserRoutes = require('./routes/admin/editUser');
const salesRoute = require('./routes/admin/sales');
const bookTestDriveRoute = require('./routes/bookTestDrive');
const testDrivesRoute = require('./routes/admin/testDrives');
const buyRoute = require('./routes/buy');
const analyticsRoute = require('./routes/admin/analytics');

app.use('/admin', adminRoutes);
app.use('/admin', addCarRoutes); // Register the addCar routes
app.use('/admin', editCarRoutes); // Register the editCar routes
app.use('/admin', editUserRoutes); // Register the editUser routes
app.use('/admin', priceRoute); // Mount price routes under /admin
app.use('/admin', demandRoute); // Mount demand routes under /admin
app.use('/admin', salesRoute);
app.use('/', bookTestDriveRoute);
app.use('/admin', testDrivesRoute);
app.use('/', buyRoute);
app.use('/admin', analyticsRoute);
const demandAnalyticsRoute = require('./routes/admin/demandAnalytics');
app.use('/admin', demandAnalyticsRoute);
const priceAnalyticsRoute = require('./routes/admin/priceAnalytics');
app.use('/admin', priceAnalyticsRoute);

// Other routes


app.get('/about', (req, res) => {
    res.render('about');
});

app.get('/predict-demand', (req, res) => {
    res.render('predict-demand');
});

app.get('/filter', (req, res) => {
    res.render('filter');
});

app.get('/contactUs', (req, res) => {
    res.render('contactUs');
});

const assistantRoute      = require('./routes/assistant');
app.use('/api', assistantRoute);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
