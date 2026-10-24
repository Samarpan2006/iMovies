const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { formatSeatDisplay } = require('../utils/seatHelper');

/**
 * Generates an official, beautifully styled PDF ticket admission pass buffer.
 * Includes movie details, auditorium metadata, seat list, pricing, and live QR code.
 * If the ticket is cancelled or refunded, stamps a prominent VOID watermark.
 */
const generateTicketPdf = async (booking) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const isCancelled = booking.status === 'CANCELLED' || booking.paymentStatus === 'Cancelled';
      const isRefunded = booking.status === 'REFUNDED' || booking.paymentStatus === 'Refunded';
      const isActive = !isCancelled && !isRefunded && booking.paymentStatus === 'Completed';

      // Generate QR Code Buffer
      const qrPayload = isActive
        ? `iMovies-Pass:${booking.bookingId}:${booking.showId}:${(booking.selectedSeats || []).join(',')}`
        : `iMovies-VOID:${booking.bookingId}`;

      const qrBuffer = await QRCode.toBuffer(qrPayload, {
        width: 130,
        margin: 1,
        color: {
          dark: isCancelled ? '#ef4444' : isRefunded ? '#3b82f6' : '#111111',
          light: '#ffffff'
        }
      });

      // Background Canvas
      doc.rect(40, 40, 515, 720).fill('#0f0f0f');

      // Top Cinema Header Band (Red Accent)
      doc.rect(40, 40, 515, 60).fill('#e50914');
      doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
        .text('iMovies Cinema Ticket', 60, 52);
      doc.fontSize(10).font('Helvetica')
        .text('OFFICIAL DIGITAL ADMISSION PASS', 60, 77);

      // Status Badge Banner
      let bannerColor = '#10b981';
      let bannerText = 'CONFIRMED ACTIVE PASS  •  AUTHORIZED ADMISSION';
      if (isCancelled) {
        bannerColor = '#ef4444';
        bannerText = 'VOID  •  TICKET CANCELLED  •  ENTRY DENIED';
      } else if (isRefunded) {
        bannerColor = '#3b82f6';
        bannerText = 'VOID  •  PAYMENT REFUNDED  •  ADMISSION REVOKED';
      }

      doc.rect(40, 100, 515, 26).fill(bannerColor);
      doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
        .text(bannerText, 60, 108, { align: 'center', width: 475 });

      // Ticket Main Body Card
      doc.rect(55, 140, 485, 340).fill('#181818');
      doc.rect(55, 140, 485, 340).stroke('#262626');

      // Left Column: Movie Info & Booking Details
      doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
        .text(booking.movieName || 'Cinema Feature', 75, 160, { width: 300 });

      doc.fillColor('#9ca3af').fontSize(11).font('Helvetica')
        .text(`Auditorium: ${booking.theatreName || 'Multiplex'}`, 75, 200)
        .text(`Screening Date: ${booking.showDate || 'N/A'}`, 75, 225)
        .text(`Showtime: ${booking.showTime || 'N/A'}`, 75, 250);

      // Seat Badges Row
      doc.fillColor('#e50914').fontSize(12).font('Helvetica-Bold')
        .text('Allocated Seats:', 75, 285);
      
      const seats = (booking.selectedSeats || []).map(formatSeatDisplay).join('   •   ') || 'None';
      doc.fillColor(isCancelled || isRefunded ? '#6b7280' : '#ffffff').fontSize(14).font('Helvetica-Bold')
        .text(seats, 75, 305);

      // Price & Booking Reference
      doc.fillColor('#9ca3af').fontSize(10).font('Helvetica')
        .text(`Total Amount Paid: INR ${booking.totalAmount || 0}`, 75, 340)
        .text(`Booking Reference: #${booking.bookingId}`, 75, 360)
        .text(`Guest Email: ${booking.userEmail || 'N/A'}`, 75, 380);

      // Right Column: QR Code Box
      doc.rect(385, 160, 140, 185).fill('#ffffff');
      doc.image(qrBuffer, 390, 165, { width: 130, height: 130 });

      doc.fillColor(isCancelled || isRefunded ? '#ef4444' : '#111111')
        .fontSize(8).font('Helvetica-Bold')
        .text(isActive ? 'SCAN FOR ENTRY' : 'TICKET VOID', 390, 305, { align: 'center', width: 130 });
      doc.fontSize(7).font('Helvetica')
        .text(isActive ? 'Turnstile Checkpoint' : 'Do Not Scan', 390, 320, { align: 'center', width: 130 });

      // Stub Perforation Line (Dashed)
      doc.save();
      doc.strokeColor('#333333').lineWidth(1).dash(5, { space: 4 });
      doc.moveTo(55, 430).lineTo(540, 430).stroke();
      doc.restore();

      // Barcode simulation
      doc.fillColor('#6b7280').fontSize(8).font('Helvetica')
        .text(`||| | | |||| ||| || | |||| || | || |||| | | ||||| ||| ||| ${booking.bookingId?.slice(0, 16)}`, 75, 450);

      // Terms & Security Notice
      doc.rect(55, 500, 485, 180).fill('#141414');
      doc.rect(55, 500, 485, 180).stroke('#222222');

      doc.fillColor('#e50914').fontSize(11).font('Helvetica-Bold')
        .text('Important Admission Instructions', 75, 515);

      doc.fillColor('#9ca3af').fontSize(9).font('Helvetica')
        .text('1. Please arrive at the cinema complex at least 15 minutes before the scheduled showtime.', 75, 535)
        .text('2. Present the digital QR code on your mobile device or this printed pass at the checkpoint.', 75, 555)
        .text('3. Outside food and beverages are strictly prohibited inside auditorium screens.', 75, 575)
        .text('4. Tickets once booked are subject to the iMovies cancellation & refund guidelines.', 75, 595)
        .text('5. This admission pass is cryptographically verified and strictly non-transferable.', 75, 615);

      if (isCancelled || isRefunded) {
        // Prominent diagonal VOID Stamp
        doc.save();
        doc.fillColor('#ef4444', 0.15)
          .fontSize(65).font('Helvetica-Bold')
          .rotate(-25, { origin: [290, 360] })
          .text('VOID / CANCELLED', 110, 340, { align: 'center' });
        doc.restore();
      }

      // Footer
      doc.fillColor('#555555').fontSize(8).font('Helvetica')
        .text('Powered by iMovies Cinema Ticketing Platform  •  Support: support@imovies.com', 40, 735, { align: 'center', width: 515 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateTicketPdf };
