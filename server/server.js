require('dotenv').config();

// Production-grade startup check
const requiredEnv = ['MONGO_URI', 'JWT_SECRET'];
requiredEnv.forEach(env => {
    if (!process.env[env]) {
        console.error(`FATAL ERROR: ${env} is not defined. Server cannot start.`);
        process.exit(1);
    }
});

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const connectDB = require('../models/index');
const cookieParser = require('cookie-parser');
require('express-async-errors');
const rateLimit = require('express-rate-limit');
const apiRoutes = require('../routes/api');
const DataService = require('../services/dataService');

const app = express();
const PORT = process.env.PORT || 9928;

// Middleware for security
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            "img-src": ["'self'", "data:", "https://images.unsplash.com", "https://cdn-icons-png.flaticon.com", "https://encrypted-tbn0.gstatic.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// Rate Limiting - Strict for Auth, Moderate for public
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests, please try again later.' }
});
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // Max 10 attempts per 15 mins
    message: { success: false, message: 'Too many login attempts, please try again in 15 minutes.' }
});

app.use('/api/', apiLimiter);
app.use('/api/user/login', authLimiter);
app.use('/api/admin/login', authLimiter);

// Connect to MongoDB & Seed Data
connectDB().then(async () => {
    try {
        // Seed or Update default admin
        const admin = await DataService.findAdmin({ username: 'admin' });
        if (!admin) {
            await DataService.addAdmin({ 
                username: 'admin', 
                password: 'ANsh' 
            });
            console.log('🛡️ System Admin Seeded: admin / ANsh');
        } else {
            // Ensure password matches the new requirement
            const bcrypt = require('bcryptjs');
            const isMatch = await bcrypt.compare('ANsh', admin.password);
            if (!isMatch) {
                const hashedPassword = await bcrypt.hash('ANsh', 10);
                await require('../models/Admin').updateOne({ username: 'admin' }, { password: hashedPassword });
                console.log('🛡️ System Admin Password Updated to: ANsh');
            }
        }

        // Seed Menu if empty
        const menu = await DataService.getMenu();
        if (menu.length === 0) {
            console.log('🌱 Seeding Royal Indian Rasoi Menu...');
            const seedDishes = [
                { name: "Butter Chicken", price: 450, description: "Classic tandoori chicken in creamy tomato gravy.", category: "Main Course", imageUrl: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&q=80&w=400" },
                { name: "Paneer Tikka Masala", price: 380, description: "Grilled paneer cubes in spicy onion-tomato masala.", category: "Main Course", imageUrl: "https://images.unsplash.com/photo-1567184109411-47a7a372d244?auto=format&fit=crop&q=80&w=400" },
                { name: "Lucknowi Biryani", price: 550, description: "Fragrant basmati rice cooked with tender lamb and saffron.", category: "Biryani", imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?auto=format&fit=crop&q=80&w=400" },
                { name: "Dal Makhani", price: 320, description: "Slow-cooked black lentils with cream and butter.", category: "Main Course", imageUrl: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=400" },
                { name: "Gulab Jamun", price: 180, description: "Soft milk dumplings soaked in cardamom sugar syrup.", category: "Dessert", imageUrl: "https://images.unsplash.com/photo-1589119908995-c6837fa14848?auto=format&fit=crop&q=80&w=400" }
            ];
            for (const dish of seedDishes) {
                await DataService.addMenu(dish);
            }
            console.log('✅ Menu Seeded with 5 signature dishes');
        }
        console.log("System initialized (MongoDB available: " + DataService.isMongoAvailable() + ")");
    } catch (err) {
        console.error("Initialization Error:", err.message);
    }
});

// Routes for our API
app.use('/api', apiRoutes);

// Frontend Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../views/index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../views/login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, '../views/signup.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../views/dashboard.html')));
app.get('/user-dashboard', (req, res) => res.sendFile(path.join(__dirname, '../views/user_dashboard.html')));

// 404 Handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../views/index.html'));
});

// Centralized Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: 'A server error occurred. Please try again later.'
    });
});

// Start the server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
