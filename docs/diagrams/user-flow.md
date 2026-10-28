# 🗺️ User Flow Diagram

This document illustrates the end-to-end user journey across the **iMovies** platform, encompassing account authentication, dynamic movie discovery, seat selection, payment processing, ticket fulfillment, and admin workflows.

---

## 1. Complete End-to-End User Journey

```mermaid
flowchart TD
    Start(["User Lands on Platform"]) --> Landing["Landing / Hero Page"]

    Landing --> Choice{"Authenticated User?"}
    Choice -- "No" --> AuthModal["Sign Up / Sign In Page"]
    Choice -- "Yes" --> Home["Home Dashboard"]

    subgraph Authentication ["1. Authentication & Security Flow"]
        AuthModal --> RegAction["Register Account"]
        RegAction --> OTPModal["6-Digit OTP Verification Modal"]
        OTPModal --> BrevoOTP["Brevo Sends OTP & Direct Link"]
        BrevoOTP --> VerifySuccess{"Valid OTP or Link?"}
        VerifySuccess -- "Yes" --> JWT["Issue JWT & Redirect"]
        VerifySuccess -- "No" --> OTPModal

        AuthModal --> ForgotPass["Forgot Password?"]
        ForgotPass --> RecoveryModal["Enter Email & Receive 6-Digit Code"]
        RecoveryModal --> SetPass["Submit New Password & Login"]
        
        AuthModal --> LoginAction["Sign In (Moviegoer / Admin Desk)"]
        LoginAction --> RoleCheck{"Admin or User?"}
        RoleCheck -- "Admin" --> AdminPanel["Admin Dashboard (/admin)"]
        RoleCheck -- "User" --> Home
    end

    subgraph Discovery ["2. Movie Discovery & Search"]
        Home --> SearchBar["Real-Time Fuzzy Search Bar"]
        SearchBar --> SuggestBox["Live TMDB Recommendations Dropdown"]
        SuggestBox --> Details["Movie Details Page (/moviedetails/:id)"]

        Home --> Feeds["Curated Category Feeds"]
        Feeds --> Trending["Trending in India"]
        Feeds --> Bollywood["Bollywood Blockbusters"]
        Feeds --> Genres["Action / Horror / Comedy Feeds"]
        Trending --> Details
        Bollywood --> Details
        Genres --> Details
    end

    subgraph BookingFlow ["3. Scheduling & Seat Selection"]
        Details --> ShowList["Select Date & Auditorium (/movieshows/:id)"]
        ShowList --> ChronoSort["Chronologically Sorted Showtimes"]
        ChronoSort --> TimeFilter{"Has Showtime Passed?"}
        TimeFilter -- "Yes (Past Time)" --> DisabledShow["Showtime Card Disabled & Grayed Out"]
        TimeFilter -- "No (Upcoming)" --> SeatMap["Auditorium Seat Map (/seatslug/:id)"]

        SeatMap --> Tiers["Select Seats (Balcony / Middle / Lower)"]
        Tiers --> SocketSync["Socket.io Broadcasts Seat Lock to Clients"]
        SocketSync --> TTLLock["MongoDB Atomic SeatLock Created (10m TTL)"]
    end

    subgraph Payment ["4. Payment Gateway & Verification"]
        TTLLock --> CheckoutBtn["Proceed to Checkout"]
        CheckoutBtn --> CreateOrder["POST /api/payment/create-order"]
        CreateOrder --> RazorpayModal["Razorpay Modal (UPI / GPay / Cards / NetBanking)"]
        RazorpayModal --> TxnResult{"Payment Success?"}
        TxnResult -- "Failed" --> ReleaseLock["Release Locked Seats & Prompt Retry"]
        TxnResult -- "Success" --> VerifySig["POST /api/payment/verify (HMAC SHA-256)"]
        VerifySig --> FinalizeBooking["Mark Booking ACTIVE & Seats BOOKED"]
    end

    subgraph Fulfillment ["5. Digital Fulfillment & Post-Booking"]
        FinalizeBooking --> TicketScreen["Ticket Receipt Screen (/ticket/:bookingId)"]
        FinalizeBooking --> BrevoEmail["Brevo Dispatches Confirmation Email"]
        BrevoEmail --> TicketReceipt["Email with Poster, Live QR Pass & PDF Link"]

        TicketScreen --> Share["Share Ticket to WhatsApp"]
        TicketScreen --> DownloadPDF["Download Official PDF Admission Pass"]
        TicketScreen --> MyTickets["My Tickets Dashboard (/bookings)"]

        MyTickets --> ExpireCheck{"Show Date Passed?"}
        ExpireCheck -- "Active Upcoming" --> AllowCancel["Allow Cancellation Option"]
        ExpireCheck -- "Expired Past" --> NoCancel["Display Expired Badge (Cancel Disabled)"]
        AllowCancel --> CancelAction["Cancel Ticket -> Free Seats & Trigger Refund"]
    end

    subgraph AdminDesk ["6. Administrator Management Desk"]
        AdminPanel --> AdminKPIs["Revenue, Bookings, Movies & Users Metrics"]
        AdminPanel --> ManageMovies["Add / Edit / Remove TMDB Movies"]
        AdminPanel --> ManageTheatres["Manage Theatres & Seat Layouts"]
        AdminPanel --> ManageShows["Schedule Shows with Custom Pricing"]
        AdminPanel --> RefundDesk["1-Click Razorpay Refund Issuance"]
        RefundDesk --> EmailStatus["Brevo Sends Cancellation & Refund Notice"]
    end
```

---

## 2. Key User Journeys Explained

### A. Moviegoer Journey
1. **Browse**: Moviegoer searches titles via fuzzy search or explores live TMDB trending/Bollywood sections.
2. **Select Showtime**: Chronologically ordered showtimes filter out any past slots for the current date.
3. **Interactive Seating**: User selects seats across Balcony, Middle, or Lower tiers with live WebSocket sync.
4. **Instant Payment**: Seamless checkout via Razorpay with UPI/Cards and cryptographic verification.
5. **Admission Pass**: Instant receipt generated with live QR pass, downloadable PDF, and automated Brevo email.

### B. Admin Journey
1. **Login**: Seamless administrative authentication with automatic role detection.
2. **Audit & Monitor**: Real-time KPI financial metrics, ticket counts, and user management.
3. **Schedule Operations**: Adding multiplex screens, scheduling auditorium showtimes, and managing film metadata.
4. **Financial Control**: 1-click Razorpay transaction refunds with automatic seat release and email dispatch.
