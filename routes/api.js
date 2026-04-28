const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const geminiService = require('../server/geminiService');
const DataService = require('../services/dataService');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Helper for validation errors
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
};

// Test route
router.get('/test', (req, res) => {
    res.json({ success: true, message: "Royal Indian Rasoi API is operational." });
});

// GET stats for dashboard (Admin Only)
router.get('/stats', verifyToken, isAdmin, async (req, res) => {
    const [bookingCount, contactCount, menuCount, orderCount] = await Promise.all([
        DataService.getBookings().then(d => d.length),
        DataService.getContacts().then(d => d.length),
        DataService.getMenu().then(d => d.length),
        DataService.getOrders().then(d => d.length)
    ]);
    
    res.json({
        success: true,
        bookings: bookingCount,
        contacts: contactCount,
        menuItems: menuCount,
        orders: orderCount
    });
});

// GET menu items (Public)
router.get('/menu', async (req, res) => {
    const menu = await DataService.getMenu();
    res.json({ success: true, data: menu });
});

// Save a new booking (Public/User)
router.post('/book-table', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('guests').isInt({ min: 1, max: 20 }).withMessage('Guests must be between 1 and 20'),
    body('date').notEmpty().withMessage('Date is required'),
    body('time').notEmpty().withMessage('Time is required')
], validate, async (req, res) => {
    const newBooking = await DataService.addBooking({
        customerName: req.body.name,
        email: req.body.email,
        phoneNumber: req.body.phone,
        numberOfPeople: req.body.guests,
        bookingDate: req.body.date,
        bookingTime: req.body.time,
        specialRequest: req.body.message
    });

    res.status(201).json({ 
        success: true, 
        message: "Table booked successfully! See you soon!",
        data: newBooking 
    });
});

// Save contact message (Public)
router.post('/contact-us', [
    body('name').trim().notEmpty(),
    body('email').isEmail(),
    body('subject').trim().notEmpty(),
    body('message').trim().notEmpty()
], validate, async (req, res) => {
    await DataService.addContact({
        fullName: req.body.name,
        email: req.body.email,
        subject: req.body.subject,
        message: req.body.message
    });
    res.status(201).json({ success: true, message: "Message sent! We will contact you soon." });
});

// --- ORDER ROUTES ---

router.post('/order', verifyToken, [
    body('items').notEmpty().withMessage('Items are required'),
    body('total').isNumeric().withMessage('Total must be a number')
], validate, async (req, res) => {
    const newOrder = await DataService.addOrder({
        customerEmail: req.user.email, 
        items: req.body.items,
        totalAmount: req.body.total,
        status: 'Pending'
    });
    res.json({ success: true, message: "Order placed!", order: newOrder });
});

router.get('/user/orders', verifyToken, async (req, res) => {
    const orders = await DataService.getOrders({ customerEmail: req.user.email });
    res.json({ success: true, data: orders });
});

router.get('/admin/orders', verifyToken, isAdmin, async (req, res) => {
    const orders = await DataService.getOrders();
    res.json({ success: true, data: orders });
});

router.put('/admin/orders/:id', verifyToken, isAdmin, async (req, res) => {
    const { status } = req.body;
    const allowedStatuses = ['Pending', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const order = await DataService.updateOrder(req.params.id, { status });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true, message: "Order updated!", order });
});

// --- USER AUTH ROUTES ---

router.post('/user/signup', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], validate, async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await DataService.findUser({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already registered" });
        }
        
        const newUser = await DataService.addUser({ fullName: name, email, password });
        
        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET missing in environment");
            return res.status(500).json({ success: false, message: "Server auth configuration error" });
        }

        const token = jwt.sign(
            { id: newUser._id, email: newUser.email, role: 'user' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );
        
        res.status(201).json({ 
            success: true, 
            message: "Account created! Welcome to the Rasoi.", 
            token,
            user: { name: newUser.fullName, email: newUser.email } 
        });
    } catch (err) {
        console.error("Signup Error:", err);
        res.status(500).json({ success: false, message: "Registration failed. " + (err.message || "") });
    }
});

router.post('/user/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], validate, async (req, res) => {
    const { email, password } = req.body;
    const user = await DataService.findUser({ email });
    
    const invalidMsg = "Invalid email or password";
    if (user && await user.validPassword(password)) {
        if (!process.env.JWT_SECRET) return res.status(500).json({ success: false, message: "Auth error" });

        const token = jwt.sign(
            { id: user._id, email: user.email, role: 'user' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );
        res.json({ 
            success: true, 
            message: "Login successful!", 
            token,
            user: { name: user.fullName, email: user.email } 
        });
    } else {
        res.status(401).json({ success: false, message: invalidMsg });
    }
});

router.get('/user/bookings', verifyToken, async (req, res) => {
    const userBookings = await DataService.getBookings({ email: req.user.email });
    res.json({ success: true, data: userBookings });
});

router.put('/user/bookings/:id', verifyToken, async (req, res) => {
    const { bookingDate, bookingTime } = req.body;
    // Security: Check if booking belongs to user
    const bookings = await DataService.getBookings({ email: req.user.email });
    const booking = bookings.find(b => b._id.toString() === req.params.id);
    if (!booking) return res.status(403).json({ success: false, message: "Unauthorized or booking not found" });

    const updated = await DataService.updateBooking(req.params.id, { bookingDate, bookingTime });
    res.json({ success: true, message: "Booking updated", data: updated });
});

router.delete('/user/bookings/:id', verifyToken, async (req, res) => {
    const bookings = await DataService.getBookings({ email: req.user.email });
    const booking = bookings.find(b => b._id.toString() === req.params.id);
    if (!booking) return res.status(403).json({ success: false, message: "Unauthorized or booking not found" });

    await DataService.deleteBooking(req.params.id);
    res.json({ success: true, message: "Booking cancelled" });
});

router.put('/user/orders/:id', verifyToken, async (req, res) => {
    const { status } = req.body;
    if (status !== 'Cancelled') return res.status(400).json({ success: false, message: "Only cancellation allowed" });

    const orders = await DataService.getOrders({ customerEmail: req.user.email });
    const order = orders.find(o => o._id.toString() === req.params.id);
    if (!order) return res.status(403).json({ success: false, message: "Unauthorized or order not found" });

    if (order.status !== 'Pending') return res.status(400).json({ success: false, message: "Only pending orders can be cancelled" });

    const updated = await DataService.updateOrder(req.params.id, { status: 'Cancelled' });
    res.json({ success: true, message: "Order cancelled", data: updated });
});

// --- ADMIN ROUTES ---

router.post('/admin/login', [
    body('username').trim().notEmpty(),
    body('password').notEmpty()
], validate, async (req, res) => {
    const { username, password } = req.body;
    const admin = await DataService.findAdmin({ username });
    
    if (admin && await admin.validPassword(password)) {
        if (!process.env.JWT_SECRET) return res.status(500).json({ success: false, message: "Auth error" });

        const token = jwt.sign(
            { id: admin._id, username: admin.username, role: 'admin' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );
        res.json({ 
            success: true, 
            message: "Admin authenticated successfully", 
            token,
            user: { username: admin.username }
        });
    } else {
        res.status(401).json({ success: false, message: "Invalid credentials" });
    }
});

router.get('/admin/bookings', verifyToken, isAdmin, async (req, res) => {
    const allBookings = await DataService.getBookings();
    res.json({ success: true, data: allBookings });
});

router.put('/admin/bookings/:id', verifyToken, isAdmin, async (req, res) => {
    const { customerName, numberOfPeople, bookingDate, bookingTime } = req.body;
    const booking = await DataService.updateBooking(req.params.id, 
        { customerName, numberOfPeople, bookingDate, bookingTime }
    );
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    res.json({ success: true, message: "Booking updated!", booking });
});

router.delete('/admin/bookings/:id', verifyToken, isAdmin, async (req, res) => {
    await DataService.deleteBooking(req.params.id);
    res.json({ success: true, message: "Booking record removed." });
});

// --- MENU MANAGEMENT (Admin Only) ---

router.post('/admin/menu', verifyToken, isAdmin, [
    body('name').trim().notEmpty(),
    body('price').isNumeric(),
    body('description').trim().notEmpty()
], validate, async (req, res) => {
    const { name, price, description, imageUrl, category } = req.body;
    const newItem = await DataService.addMenu({ name, price, description, imageUrl, category });
    res.status(201).json({ success: true, message: "Dish added to menu!", data: newItem });
});

router.delete('/admin/menu/:id', verifyToken, isAdmin, async (req, res) => {
    await DataService.deleteMenu(req.params.id);
    res.json({ success: true, message: "Dish removed from menu." });
});

router.get('/admin/contacts', verifyToken, isAdmin, async (req, res) => {
    const contacts = await DataService.getContacts();
    res.json({ success: true, data: contacts });
});

// AI Chatbot
router.post('/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: "Message is required" });
    try {
        const response = await geminiService.getChatResponse(message);
        res.json({ success: true, response });
    } catch (err) {
        res.status(500).json({ success: false, message: "AI Assistant is resting." });
    }
});

module.exports = router;
