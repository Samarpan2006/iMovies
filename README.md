# 🎬 iMovies - Movie Ticket Booking Platform

> **iMovies** is a full-stack, responsive, production-ready Movie Ticket Booking Web Application engineered following the Model-View-Controller (MVC) architecture pattern.

---

## 🌟 Key Features & Architectural Highlights

### 1. Live Market Cinema Feed (TMDB API)
- Connects directly to `https://api.themoviedb.org/3` (`/movie/now_playing`, `/movie/popular`, `/movie/:id`, and `/search/movie`).
- Delivers real-time posters, trailers, backdrop art, ratings, runtime, and cast line-ups.

### 2. Interactive Tiered Seat Map & Real-Time Locking
- Dynamic auditorium seat grid supporting **Balcony**, **Middle**, and **Lower** tiers with independent pricing.
- **WebSocket & Socket.io** live seat sync across all connected clients.
- **Temporary Seat Locking (TTL)**: When a moviegoer picks seats on `/seatslug/:showId`, seats are locked to prevent double-booking.
- Automated `cleanupService.js` driven by `node-cron` releases expired locks automatically every 5 minutes.

### 3. Razorpay Test-Mode Payment Gateway (UPI & Multi-Option)
Strict 5-step transaction flow:
1. **Selection:** User reviews chosen seats and total cost.
2. **Frontend Order Request:** Calls `POST /api/payment/create-order`.
3. **Gateway Communication:** Backend creates Razorpay order via official SDK.
4. **Checkout Modal:** `window.Razorpay` popup with native UPI (GPay, PhonePe, Paytm, QR) and Cards/NetBanking.
5. **Cryptographic HMAC SHA256 Verification:** `POST /api/payment/verify` verifies payment authenticity, marks booking `Completed`, and books seats.

### 4. Digital Confirmation & Sharing
- **Nodemailer SMTP:** Generates automated HTML ticket confirmation emails.
- **WhatsApp Ticket Share:** Emoji-formatted message generator (`client/src/utils/whatsappHelper.js`) for instant 1-click sharing to WhatsApp.
- **Scheduled Reminders:** Automated `reminderService.js` checking upcoming showtimes via `node-cron`.

### 5. Admin Dashboard & Refund Desk
- KPI financial metrics: Total platform revenue, active bookings, listed films, and user accounts.
- **Transactions & Refund Panel:** Table displaying all transactions with live status badges.
- **1-Click Refund:** Admin can click "Issue Refund", calling `POST /api/admin/refund/:paymentId` via Razorpay refund SDK, setting booking status to `Refunded` and freeing the reserved auditorium seats.

---

## 📁 Directory Structure

```
iMovies/
├── client/                     # Frontend (Vite + React 19 + Tailwind CSS)
│   ├── src/
│   │   ├── components/         # Header, Footer, Loader, MovieCard, Protection
│   │   ├── hooks/              # useFetch custom hook
│   │   ├── pages/              # 12 Route Pages with React.lazy
│   │   ├── utils/              # api.js (Axios), whatsappHelper.js
│   │   ├── App.jsx             # React Router with Suspense & ToastContainer
│   │   ├── main.jsx
│   │   └── index.css           # Tailwind Cinema Theme & Seat Styles
│   ├── index.html              # Razorpay checkout SDK
│   ├── vite.config.js          # Tailwind plugin configuration
│   └── package.json
└── server/                     # Backend (Node.js + Express + Socket.io)
    ├── controllers/            # Auth, Movies, Theatres, Shows, Bookings, Payments, Reviews, Admin
    ├── middlewares/            # fetchUser.js (JWT), isAdmin.js
    ├── models/                 # 8 Mongoose Models (User, Admin, Movie, Theatre, Show, Booking, Favorite, Review)
    ├── routes/                 # Express REST API routes under /api
    ├── services/               # tmdbService.js, emailService.js
    ├── utils/                  # cleanupService.js, reminderService.js, mailer.js
    ├── seed.js                 # Database seed script for default credentials
    ├── server.js               # Express + Socket.io + Cron entry point
    └── .env                    # Environment credentials & keys
```

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [MongoDB](https://www.mongodb.com/) (running on `mongodb://127.0.0.1:27017/imovies`)

### 2. Backend Setup
```bash
cd iMovies/server
npm install
node seed.js    # (Optional: seeds default admin, user, and auditorium)
npm start       # Starts Express + Socket.io server on port 5000
```

### 3. Frontend Setup
```bash
cd iMovies/client
npm install
npm run dev     # Starts Vite dev server on http://localhost:5173
```

---

## 🔑 Default Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@imovies.com` | `admin123` |
| **Moviegoer** | `demo@imovies.com` | `user123` |
