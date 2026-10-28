# 📊 Entity-Relationship (ER) Diagram

This document details the database schema architecture and relational data model implemented in **iMovies** using MongoDB and Mongoose ODM.

---

## 1. Schema Relationships Diagram

```mermaid
erDiagram
    USER ||--o{ BOOKING : places
    USER ||--o{ FAVORITE : saves
    USER ||--o{ REVIEW : writes
    ADMIN ||--o{ THEATRE : manages
    ADMIN ||--o{ SHOW : schedules
    MOVIE ||--o{ SHOW : features
    MOVIE ||--o{ REVIEW : receives
    MOVIE ||--o{ FAVORITE : cataloged_as
    THEATRE ||--o{ SHOW : hosts
    SHOW ||--o{ BOOKING : reserves
    SHOW ||--o{ SEAT_LOCK : holds

    USER {
        ObjectId _id PK
        string username
        string email UK
        string password "hashed"
        string role "user | admin"
        boolean isVerified
        string verificationOtp
        date verificationOtpExpires
        string verificationToken
        string resetPasswordOtp
        date resetPasswordExpires
        string resetPasswordToken
        date createdAt
        date updatedAt
    }

    ADMIN {
        ObjectId _id PK
        string username
        string email UK
        string password "hashed"
        date createdAt
        date updatedAt
    }

    MOVIE {
        ObjectId _id PK
        string tmdbId UK
        string title
        string overview
        string posterPath
        string backdropPath
        string releaseDate
        number voteAverage
        number voteCount
        string[] genres
        number runtime
        string trailerUrl
        object[] cast
        string[] languages
        date createdAt
        date updatedAt
    }

    THEATRE {
        ObjectId _id PK
        string theatreId UK
        string theatreName
        string location
        number balconySeatPrice
        number middleSeatPrice
        number lowerSeatPrice
        object balconySeats "Row-Col Grid"
        object middleSeats "Row-Col Grid"
        object lowerSeats "Row-Col Grid"
        date createdAt
        date updatedAt
    }

    SHOW {
        ObjectId _id PK
        string showId UK
        string movieId FK
        string theatreId FK
        string theatreName
        string showDate "YYYY-MM-DD"
        string showTime "HH:mm"
        string adminEmail FK
        object tickets "Tiered Seat State Matrix"
        date createdAt
        date updatedAt
    }

    BOOKING {
        ObjectId _id PK
        string bookingId UK
        string userEmail FK
        string userName
        string movieId FK
        string movieName
        string moviePoster
        string theatreId FK
        string theatreName
        string showId FK
        string showDate
        string showTime
        string[] selectedSeats "e.g. Balcony-A-1"
        number totalAmount
        string paymentStatus "Pending | Completed | Failed | Refunded"
        string razorpayOrderId
        string razorpayPaymentId
        string razorpaySignature
        string qrCodeData
        string status "ACTIVE | CANCELLED | EXPIRED"
        date createdAt
        date updatedAt
    }

    SEAT_LOCK {
        ObjectId _id PK
        string showId FK
        string seatId "e.g. balcony-A-1"
        string tier "balcony | middle | lower"
        string row "A, B, C..."
        number col "1, 2, 3..."
        string status "LOCKED | BOOKED"
        string lockedBy "userEmail"
        date lockExpiry "TTL Indexed"
        string bookingId FK
        date createdAt
        date updatedAt
    }

    FAVORITE {
        ObjectId _id PK
        string userEmail FK
        string movieId FK
        string title
        string posterPath
        string releaseDate
        number voteAverage
        date createdAt
        date updatedAt
    }

    REVIEW {
        ObjectId _id PK
        string movieId FK
        string userEmail FK
        string userName
        number rating "1 to 5"
        string comment
        date createdAt
        date updatedAt
    }
```

---

## 2. Relational Descriptions & Cardinality

| Parent Entity | Relation | Child Entity | Cardinality | Implementation Description |
|---|---|---|---|---|
| **User** | places | **Booking** | 1 : N | A registered moviegoer can place zero or multiple ticket bookings over time. |
| **User** | saves | **Favorite** | 1 : N | Users can bookmark favorite movies for quick discovery. |
| **User** | writes | **Review** | 1 : N | Verified users write ratings and reviews for listed titles. |
| **Theatre** | hosts | **Show** | 1 : N | A physical multiplex screen hosts multiple scheduled shows across dates and times. |
| **Movie** | features | **Show** | 1 : N | A film title can be scheduled across multiple auditoriums and showtimes. |
| **Show** | reserves | **Booking** | 1 : N | Each show manages ticket reservations. |
| **Show** | holds | **SeatLock** | 1 : N | Dynamic seat holding prevents concurrent collisions during checkout. |
| **Movie** | receives | **Review** | 1 : N | Aggregates community feedback, ratings, and testimonials. |

---

## 3. High-Performance Indexing & Constraints

1. **Unique Indexes**:
   - `User.email`: Ensures unique accounts per email address.
   - `Admin.email`: Unique administrator identity.
   - `Movie.tmdbId`: Prevents duplicate film indexing from external TMDB calls.
   - `Theatre.theatreId` & `Show.showId` & `Booking.bookingId`: Unique UUID identifiers.
2. **Compound & Concurrency Indexes**:
   - `SeatLock({ showId: 1, seatId: 1 })`: Unique compound index enforcing atomic seat lock allocation to eliminate race conditions.
3. **Time-To-Live (TTL) Auto-Expiring Indexes**:
   - `SeatLock.lockExpiry`: Automatically purged by MongoDB's background TTL monitor when temporary checkout reservations expire (default: 10 minutes).
