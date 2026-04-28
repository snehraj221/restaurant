const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Paths for local JSON storage
const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const getLocalFile = (collection) => path.join(DATA_DIR, `${collection}.json`);

const readLocal = (collection) => {
    const file = getLocalFile(collection);
    if (!fs.existsSync(file)) return [];
    try {
        const content = fs.readFileSync(file, 'utf8');
        return content ? JSON.parse(content) : [];
    } catch (e) {
        console.error(`Error reading ${collection}:`, e.message);
        return [];
    }
};

const writeLocal = (collection, data) => {
    const file = getLocalFile(collection);
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(`Error writing ${collection}:`, e.message);
    }
};

// Unified Data Service for Restaurant
const DataService = {
    isMongoAvailable: () => mongoose.connection.readyState === 1,

    // Users
    async findUser(query) {
        if (this.isMongoAvailable()) return require('../models/User').findOne(query);
        const users = readLocal('users');
        const user = users.find(u => u.email === query.email || u._id === query._id);
        if (user) {
            user.validPassword = async function(pw) {
                const bcrypt = require('bcryptjs');
                return await bcrypt.compare(pw, this.password);
            };
        }
        return user;
    },

    async addUser(userData) {
        if (this.isMongoAvailable()) {
            const User = require('../models/User');
            // Set username to email if not provided to avoid null duplicate index error
            if (!userData.username) userData.username = userData.email;
            return await User.create(userData);
        }
        const users = readLocal('users');
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const newUser = { ...userData, password: hashedPassword, _id: Date.now().toString(), createdAt: new Date() };
        if (!newUser.username) newUser.username = newUser.email;
        users.push(newUser);
        writeLocal('users', users);
        return newUser;
    },

    // Admins
    async findAdmin(query) {
        if (this.isMongoAvailable()) return require('../models/Admin').findOne(query);
        const admins = readLocal('admins');
        const admin = admins.find(a => a.username === query.username || a._id === query._id);
        if (admin) {
            admin.validPassword = async function(pw) {
                const bcrypt = require('bcryptjs');
                return await bcrypt.compare(pw, this.password);
            };
        }
        return admin;
    },

    async addAdmin(adminData) {
        if (this.isMongoAvailable()) {
            const Admin = require('../models/Admin');
            return await Admin.create(adminData);
        }
        const admins = readLocal('admins');
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(adminData.password, 10);
        const newAdmin = { ...adminData, password: hashedPassword, _id: Date.now().toString(), createdAt: new Date() };
        admins.push(newAdmin);
        writeLocal('admins', admins);
        return newAdmin;
    },

    // Menu
    async getMenu() {
        if (this.isMongoAvailable()) return require('../models/Menu').find().lean();
        return readLocal('menu');
    },

    async addMenu(data) {
        if (this.isMongoAvailable()) {
            const Menu = require('../models/Menu');
            return await Menu.create(data);
        }
        const menu = readLocal('menu');
        const newItem = { ...data, _id: Date.now().toString() };
        menu.push(newItem);
        writeLocal('menu', menu);
        return newItem;
    },

    async deleteMenu(id) {
        if (this.isMongoAvailable()) return require('../models/Menu').findByIdAndDelete(id);
        let menu = readLocal('menu');
        menu = menu.filter(m => m._id !== id);
        writeLocal('menu', menu);
    },

    // Bookings
    async getBookings(query = {}) {
        if (this.isMongoAvailable()) return require('../models/Booking').find(query).sort({ createdAt: -1 }).lean();
        const bookings = readLocal('bookings');
        if (query.email) return bookings.filter(b => b.email === query.email);
        return bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    async addBooking(data) {
        if (this.isMongoAvailable()) {
            const Booking = require('../models/Booking');
            return await Booking.create(data);
        }
        const bookings = readLocal('bookings');
        const newBooking = { ...data, _id: Date.now().toString(), createdAt: new Date() };
        bookings.push(newBooking);
        writeLocal('bookings', bookings);
        return newBooking;
    },

    async updateBooking(id, data) {
        if (this.isMongoAvailable()) return require('../models/Booking').findByIdAndUpdate(id, data, { new: true });
        let items = readLocal('bookings');
        const idx = items.findIndex(i => i._id === id);
        if (idx !== -1) {
            items[idx] = { ...items[idx], ...data };
            writeLocal('bookings', items);
            return items[idx];
        }
        return null;
    },

    async deleteBooking(id) {
        if (this.isMongoAvailable()) return require('../models/Booking').findByIdAndDelete(id);
        let items = readLocal('bookings');
        items = items.filter(i => i._id !== id);
        writeLocal('bookings', items);
    },

    // Orders
    async getOrders(query = {}) {
        if (this.isMongoAvailable()) return require('../models/Order').find(query).sort({ createdAt: -1 }).lean();
        const orders = readLocal('orders');
        if (query.customerEmail) return orders.filter(o => o.customerEmail === query.customerEmail);
        return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    async addOrder(data) {
        if (this.isMongoAvailable()) {
            const Order = require('../models/Order');
            return await Order.create(data);
        }
        const orders = readLocal('orders');
        const newOrder = { ...data, _id: Date.now().toString(), status: 'Pending', createdAt: new Date() };
        orders.push(newOrder);
        writeLocal('orders', orders);
        return newOrder;
    },

    async updateOrder(id, data) {
        if (this.isMongoAvailable()) return require('../models/Order').findByIdAndUpdate(id, data, { new: true });
        let items = readLocal('orders');
        const idx = items.findIndex(i => i._id === id);
        if (idx !== -1) {
            items[idx] = { ...items[idx], ...data };
            writeLocal('orders', items);
            return items[idx];
        }
        return null;
    },

    // Contacts
    async getContacts() {
        if (this.isMongoAvailable()) return require('../models/Contact').find().sort({ createdAt: -1 }).lean();
        return readLocal('contacts').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    async addContact(data) {
        if (this.isMongoAvailable()) {
            const Contact = require('../models/Contact');
            return await Contact.create(data);
        }
        const contacts = readLocal('contacts');
        const newContact = { ...data, _id: Date.now().toString(), createdAt: new Date() };
        contacts.push(newContact);
        writeLocal('contacts', contacts);
        return newContact;
    }
};

module.exports = DataService;
