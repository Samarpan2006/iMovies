const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Returns direct URL for downloading the verified PDF cinema admission pass.
 */
export const getTicketPdfUrl = (bookingId) => `${API_BASE_URL}/bookings/${bookingId}/pdf`;

/**
 * Returns direct web URL for rendering the digital ticket view with embedded QR code.
 */
export const getTicketWebUrl = (bookingId) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  return `${origin}/ticket/${bookingId}`;
};

/**
 * Formats booking confirmation details into an emoji-rich message string
 * and generates a WhatsApp web/app share URL with embedded digital ticket
 * and downloadable PDF pass links.
 */
export const generateWhatsAppMessage = ({
  movieName,
  theatreName,
  showDate,
  showTime,
  selectedSeats,
  totalAmount,
  bookingId
}) => {
  const seatsFormatted = Array.isArray(selectedSeats) ? selectedSeats.join(', ') : (selectedSeats || 'N/A');
  const ticketWebUrl = getTicketWebUrl(bookingId);
  const pdfDownloadUrl = getTicketPdfUrl(bookingId);

  const message = `🎟️ *iMovies Admission Pass Confirmed!* 🎬

🎥 *Movie:* ${movieName || 'Movie'}
🏟️ *Cinema:* ${theatreName || 'Theatre'}
📅 *Date:* ${showDate || ''}
🕐 *Showtime:* ${showTime || ''}
💺 *Seats:* ${seatsFormatted}
💰 *Total Paid:* ₹${totalAmount || 0}
🆔 *Booking Ref:* #${bookingId || ''}

📲 *View Digital Ticket & QR Code:*
${ticketWebUrl}

📄 *Download PDF Admission Pass:*
${pdfDownloadUrl}

🍿 Scan the QR code or present your PDF pass at the gate. Enjoy your movie!`;

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
};

/**
 * Shares ticket using the Web Share API (mobile devices) with automatic
 * graceful fallback to WhatsApp click-to-chat URL.
 */
export const shareTicket = async ({
  movieName,
  theatreName,
  showDate,
  showTime,
  selectedSeats,
  totalAmount,
  bookingId
}) => {
  const ticketWebUrl = getTicketWebUrl(bookingId);
  const seatsFormatted = Array.isArray(selectedSeats) ? selectedSeats.join(', ') : (selectedSeats || 'N/A');
  const waUrl = generateWhatsAppMessage({
    movieName,
    theatreName,
    showDate,
    showTime,
    selectedSeats,
    totalAmount,
    bookingId
  });

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: `iMovies Ticket: ${movieName}`,
        text: `🎟️ Ticket for ${movieName} at ${theatreName} (${showDate} @ ${showTime}, Seats: ${seatsFormatted})`,
        url: ticketWebUrl
      });
      return { success: true, method: 'native' };
    } catch (err) {
      if (err.name !== 'AbortError') {
        window.open(waUrl, '_blank', 'noopener,noreferrer');
        return { success: true, method: 'whatsapp' };
      }
      return { success: false, aborted: true };
    }
  } else {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    return { success: true, method: 'whatsapp' };
  }
};
