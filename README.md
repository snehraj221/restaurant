# Royal Indian Rasoi - Production Grade Restaurant App

A high-performance, secure, and AI-powered restaurant management system built with Node.js and MongoDB Atlas.

## ✨ Features

- **🛡️ Secure Authentication**: JWT-based authentication for both Users and Admins.
- **📊 Real-time Dashboard**: Admin panel for managing bookings, orders, and menu items.
- **🤖 Rasoi Buddy (AI)**: Integrated chatbot powered by **Gemini 2.5** to help customers with menu inquiries.
- **🛒 Ordering System**: Full cart and ordering flow for customers.
- **📅 Table Booking**: Robust booking system with availability management.
- **🚀 Production Ready**: Security headers (Helmet), Rate Limiting, Input Validation, and Centralized Error Handling.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas (Mongoose ODM)
- **AI**: Google Gemini 2.5 API
- **Security**: JWT, BcryptJS, Helmet, Express Rate Limit
- **Frontend**: Vanilla JS, CSS3, HTML5

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas account (for the connection string)
- Google Gemini API Key

### 2. Environment Setup
Create a `.env` file in the root directory and add the following:
```env
PORT=9928
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secure_random_secret
GEMINI_API_KEY=your_google_gemini_api_key
```

### 3. Installation
```bash
# Clone the repository
git clone <repo-url>
cd restaurant-project

# Install dependencies
npm install

# Start the server
npm start
```

## 🐳 Docker Deployment
```bash
docker build -t royal-indian-rasoi .
docker run -p 9928:9928 --env-file .env royal-indian-rasoi
```

## 🔐 Security Audit Results
- ✅ **SQL Injection**: Prevented by using Mongoose ODM.
- ✅ **XSS**: Sanitized inputs and Secure Headers (Helmet).
- ✅ **CSRF**: Protected via secure JWT handling and API structure.
- ✅ **Auth**: Passwords hashed with Bcrypt (10 rounds); Session via JWT.
- ✅ **IDOR**: All user-specific routes verified against JWT claims.

## 📄 License
ISC License
