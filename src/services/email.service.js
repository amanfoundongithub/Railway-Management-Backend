import nodemailer from 'nodemailer';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('Email_Service');

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify connection on startup
transporter.verify((error) => {
  if (error) {
    logger.error('SMTP Connection Error:', error);
  } else {
    logger.info('SMTP Email transporter is ready to send messages.');
  }
});

/**
 * Generic email sender helper
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
    });
    logger.info(`Email sent successfully to ${to}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    logger.error(`Failed to send email to ${to}:`, err);
    return { success: false, error: err.message };
  }
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const displayValue = (value) => (
  value === null || value === undefined || value === '' ? '—' : escapeHtml(value)
);

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
};

const formatDateTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
      timeZoneName: 'short',
    }).format(date);
};

const formatCurrency = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount)
    : '—';
};

export const sendBookingConfirmation = async (userEmail, bookingDetails) => {
  const passengerRows = (bookingDetails.passengers || []).map((passenger, index) => `
    <tr>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e8edf3; color: #334155;">${index + 1}</td>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e8edf3; color: #0f172a; font-weight: 600;">${displayValue(passenger.name)}</td>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e8edf3; color: #475569;">${displayValue(passenger.age)}</td>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e8edf3; color: #475569;">${displayValue(passenger.gender)}</td>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e8edf3; color: #0f766e; font-weight: 600;">${displayValue(passenger.seatNumber)}</td>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e8edf3; color: #475569;">${displayValue(passenger.status)}</td>
    </tr>
  `).join('');

  const mealsSection = (bookingDetails.meals || []).length
    ? `
      <h2 style="margin: 28px 0 12px; color: #172554; font-size: 18px;">Meal orders</h2>
      ${(bookingDetails.meals || []).map((meal) => `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px; border: 1px solid #e2e8f0; border-radius: 8px; border-spacing: 0;">
          <tr>
            <td style="padding: 12px; color: #334155;">
              <strong>${displayValue(meal.restaurantName)}</strong><br>
              <span style="font-size: 13px; color: #64748b;">Delivery: ${displayValue(meal.deliveryStation)} &nbsp;|&nbsp; Status: ${displayValue(meal.orderStatus)}</span>
              ${(meal.items || []).map((item) => `
                <div style="padding-top: 8px; font-size: 13px; color: #475569;">
                  ${displayValue(item.name)} × ${displayValue(item.quantity)} — ${formatCurrency(Number(item.price) * Number(item.quantity))}
                </div>
              `).join('')}
            </td>
            <td align="right" valign="top" style="padding: 12px; color: #0f172a; font-weight: 700; white-space: nowrap;">${formatCurrency(meal.totalAmount)}</td>
          </tr>
        </table>
      `).join('')}
    `
    : '';

  const subject = `Booking Confirmed - PNR: ${bookingDetails.pnr || 'NXT_RAIL'}`;
  const html = `
    <div style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: Arial, Helvetica, sans-serif; color: #0f172a;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 700px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; border-spacing: 0; overflow: hidden;">
        <tr>
          <td style="padding: 28px 32px; background-color: #123b68; color: #ffffff;">
            <div style="font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.85;">NXT_RAIL</div>
            <h1 style="margin: 10px 0 6px; font-size: 25px;">Booking confirmed</h1>
            <p style="margin: 0; color: #dbeafe; font-size: 14px;">Your ticket is ready. Have a pleasant journey!</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 26px 32px;">
            <p style="margin: 0 0 8px; font-size: 15px;">Dear ${displayValue(bookingDetails.user?.fullName)},</p>
            <p style="margin: 0 0 22px; color: #64748b; font-size: 14px; line-height: 1.6;">Your train booking has been confirmed. Keep your PNR handy for your journey.</p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 22px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; border-spacing: 0;">
              <tr>
                <td style="padding: 14px 16px; color: #475569; font-size: 13px;">PNR NUMBER</td>
                <td align="right" style="padding: 14px 16px; color: #123b68; font-size: 20px; font-weight: 700; letter-spacing: 1px;">${displayValue(bookingDetails.pnr)}</td>
              </tr>
            </table>

            <h2 style="margin: 0 0 12px; color: #172554; font-size: 18px;">Journey details</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; border-spacing: 0;">
              <tr>
                <td style="width: 50%; padding: 13px 15px; border-bottom: 1px solid #e8edf3;">
                  <div style="color: #64748b; font-size: 12px;">TRAIN</div>
                  <div style="margin-top: 4px; color: #0f172a; font-weight: 600;">${displayValue(bookingDetails.train?.trainName)}</div>
                  <div style="margin-top: 3px; color: #64748b; font-size: 13px;">Train no. ${displayValue(bookingDetails.train?.trainNumber)}</div>
                </td>
                <td style="width: 50%; padding: 13px 15px; border-bottom: 1px solid #e8edf3;">
                  <div style="color: #64748b; font-size: 12px;">JOURNEY DATE</div>
                  <div style="margin-top: 4px; color: #0f172a; font-weight: 600;">${formatDate(bookingDetails.journeyDate)}</div>
                </td>
              </tr>
              <tr>
                <td style="padding: 13px 15px;">
                  <div style="color: #64748b; font-size: 12px;">FROM</div>
                  <div style="margin-top: 4px; color: #0f172a; font-size: 17px; font-weight: 700;">${displayValue(bookingDetails.sourceStation)}</div>
                </td>
                <td style="padding: 13px 15px;">
                  <div style="color: #64748b; font-size: 12px;">TO</div>
                  <div style="margin-top: 4px; color: #0f172a; font-size: 17px; font-weight: 700;">${displayValue(bookingDetails.destinationStation)}</div>
                </td>
              </tr>
              <tr>
                <td style="padding: 13px 15px; border-top: 1px solid #e8edf3;">
                  <div style="color: #64748b; font-size: 12px;">CLASS</div>
                  <div style="margin-top: 4px; color: #0f172a; font-weight: 600;">${displayValue(bookingDetails.coachClass)}</div>
                </td>
                <td style="padding: 13px 15px; border-top: 1px solid #e8edf3;">
                  <div style="color: #64748b; font-size: 12px;">BOOKING STATUS</div>
                  <div style="margin-top: 4px; color: #047857; font-weight: 700;">${displayValue(bookingDetails.bookingStatus)}</div>
                </td>
              </tr>
            </table>

            <h2 style="margin: 28px 0 12px; color: #172554; font-size: 18px;">Passengers</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background-color: #f8fafc; text-align: left;">
                  <th style="padding: 10px; color: #64748b; font-weight: 600;">#</th>
                  <th style="padding: 10px; color: #64748b; font-weight: 600;">Name</th>
                  <th style="padding: 10px; color: #64748b; font-weight: 600;">Age</th>
                  <th style="padding: 10px; color: #64748b; font-weight: 600;">Gender</th>
                  <th style="padding: 10px; color: #64748b; font-weight: 600;">Seat</th>
                  <th style="padding: 10px; color: #64748b; font-weight: 600;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${passengerRows || '<tr><td colspan="6" style="padding: 12px; color: #64748b;">Passenger details unavailable.</td></tr>'}
              </tbody>
            </table>

            <h2 style="margin: 28px 0 12px; color: #172554; font-size: 18px;">Payment summary</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; border-spacing: 0;">
              <tr>
                <td style="padding: 12px 15px; color: #64748b;">Transaction ID</td>
                <td align="right" style="padding: 12px 15px; color: #334155;">${displayValue(bookingDetails.transactionId)}</td>
              </tr>
              <tr>
                <td style="padding: 12px 15px; border-top: 1px solid #e8edf3; color: #64748b;">Payment status</td>
                <td align="right" style="padding: 12px 15px; border-top: 1px solid #e8edf3; color: #047857; font-weight: 600;">${displayValue(bookingDetails.paymentStatus)}</td>
              </tr>
              <tr>
                <td style="padding: 14px 15px; border-top: 1px solid #e8edf3; color: #0f172a; font-weight: 700;">Total fare</td>
                <td align="right" style="padding: 14px 15px; border-top: 1px solid #e8edf3; color: #123b68; font-size: 18px; font-weight: 700;">${formatCurrency(bookingDetails.totalFare)}</td>
              </tr>
            </table>

            ${mealsSection}
            <p style="margin: 28px 0 0; color: #64748b; font-size: 12px; line-height: 1.6;">This is an automated confirmation for the email address provided during booking. Please do not reply to this message.</p>
          </td>
        </tr>
      </table>
    </div>
  `;

  return sendEmail({ to: userEmail, subject, html });
}

export const sendCateringConfirmation = async (userEmail, orderDetails, pnr) => {
  const itemRows = (orderDetails.items || []).map((item) => `
    <tr>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e8edf3; color: #0f172a; font-weight: 600;">${displayValue(item.name)}</td>
      <td align="center" style="padding: 12px 10px; border-bottom: 1px solid #e8edf3; color: #475569;">${displayValue(item.quantity)}</td>
      <td align="right" style="padding: 12px 10px; border-bottom: 1px solid #e8edf3; color: #475569; white-space: nowrap;">${formatCurrency(item.price)}</td>
      <td align="right" style="padding: 12px 10px; border-bottom: 1px solid #e8edf3; color: #0f172a; font-weight: 600; white-space: nowrap;">${formatCurrency(Number(item.price) * Number(item.quantity))}</td>
    </tr>
  `).join('');

  const subject = `Catering order placed - PNR: ${pnr || 'N/A'}`;
  const html = `
    <div style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: Arial, Helvetica, sans-serif; color: #0f172a;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; border-spacing: 0; overflow: hidden;">
        <tr>
          <td style="padding: 28px 32px; background-color: #123b68; color: #ffffff;">
            <div style="font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.85;">NXT_RAIL E-CATERING</div>
            <h1 style="margin: 10px 0 6px; font-size: 25px;">Your food order is placed</h1>
            <p style="margin: 0; color: #dbeafe; font-size: 14px;">We’ll prepare your order for delivery at your selected station.</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 26px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 22px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; border-spacing: 0;">
              <tr>
                <td style="padding: 14px 16px; color: #475569; font-size: 13px;">ORDER ID</td>
                <td align="right" style="padding: 14px 16px; color: #123b68; font-size: 16px; font-weight: 700;">${displayValue(orderDetails._id)}</td>
              </tr>
            </table>

            <h2 style="margin: 0 0 12px; color: #172554; font-size: 18px;">Order details</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; border-spacing: 0;">
              <tr>
                <td style="width: 50%; padding: 13px 15px; border-bottom: 1px solid #e8edf3;">
                  <div style="color: #64748b; font-size: 12px;">RESTAURANT</div>
                  <div style="margin-top: 4px; color: #0f172a; font-weight: 600;">${displayValue(orderDetails.restaurantName)}</div>
                </td>
                <td style="width: 50%; padding: 13px 15px; border-bottom: 1px solid #e8edf3;">
                  <div style="color: #64748b; font-size: 12px;">DELIVERY STATION</div>
                  <div style="margin-top: 4px; color: #0f172a; font-weight: 600;">${displayValue(orderDetails.stationCode)}</div>
                </td>
              </tr>
              <tr>
                <td style="padding: 13px 15px;">
                  <div style="color: #64748b; font-size: 12px;">EXPECTED DELIVERY</div>
                  <div style="margin-top: 4px; color: #0f172a; font-weight: 600;">${formatDateTime(orderDetails.deliveryEta)}</div>
                </td>
                <td style="padding: 13px 15px;">
                  <div style="color: #64748b; font-size: 12px;">ORDER STATUS</div>
                  <div style="display: inline-block; margin-top: 4px; padding: 5px 9px; background-color: #dcfce7; border-radius: 12px; color: #166534; font-size: 12px; font-weight: 700;">${displayValue(orderDetails.status)}</div>
                </td>
              </tr>
            </table>

            <h2 style="margin: 28px 0 12px; color: #172554; font-size: 18px;">Items ordered</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background-color: #f8fafc; text-align: left;">
                  <th style="padding: 10px; color: #64748b; font-weight: 600;">Item</th>
                  <th align="center" style="padding: 10px; color: #64748b; font-weight: 600;">Qty</th>
                  <th align="right" style="padding: 10px; color: #64748b; font-weight: 600;">Price</th>
                  <th align="right" style="padding: 10px; color: #64748b; font-weight: 600;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows || '<tr><td colspan="4" style="padding: 12px; color: #64748b;">Order items unavailable.</td></tr>'}
              </tbody>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 14px; border: 1px solid #e2e8f0; border-radius: 8px; border-spacing: 0;">
              <tr>
                <td style="padding: 14px 15px; color: #0f172a; font-weight: 700;">Total amount</td>
                <td align="right" style="padding: 14px 15px; color: #123b68; font-size: 18px; font-weight: 700;">${formatCurrency(orderDetails.totalAmount)}</td>
              </tr>
            </table>

            <p style="margin: 26px 0 0; color: #64748b; font-size: 12px; line-height: 1.6;">Order reference: ${displayValue(orderDetails._id)}<br>Linked booking: ${displayValue(orderDetails.bookingId)}</p>
            <p style="margin: 14px 0 0; color: #64748b; font-size: 12px; line-height: 1.6;">This is an automated order confirmation. Please do not reply to this message.</p>
          </td>
        </tr>
      </table>
    </div>
  `;

  return sendEmail({ to: userEmail, subject, html });
};

export const sendCabBookingConfirmation = async (
  userEmail,
  cabBookingDetails,
  cabVendorDetails,
  pnr,
  guestName,
) => {
  const selectedVehicle = (cabVendorDetails.vehicles || []).find((vehicle) => (
    String(vehicle.type).toLowerCase() === String(cabBookingDetails.vehicleType).toLowerCase()
  ));
  const subject = `Cab booking confirmed - PNR: ${pnr || 'N/A'}`;
  const html = `
    <div style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: Arial, Helvetica, sans-serif; color: #0f172a;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; border-spacing: 0; overflow: hidden;">
        <tr>
          <td style="padding: 28px 32px; background-color: #123b68; color: #ffffff;">
            <div style="font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.85;">NXT_RAIL CAB</div>
            <h1 style="margin: 10px 0 6px; font-size: 25px;">Cab booking confirmed</h1>
            <p style="margin: 0; color: #dbeafe; font-size: 14px;">Your ride has been arranged for your journey.</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 26px 32px;">
            <p style="margin: 0 0 8px; font-size: 15px;">Dear ${displayValue(guestName || 'Guest')},</p>
            <p style="margin: 0 0 22px; color: #64748b; font-size: 14px; line-height: 1.6;">Your cab reservation linked to your train booking is confirmed.</p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 22px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; border-spacing: 0;">
              <tr>
                <td style="padding: 14px 16px; color: #475569; font-size: 13px;">TRAIN BOOKING PNR</td>
                <td align="right" style="padding: 14px 16px; color: #123b68; font-size: 20px; font-weight: 700; letter-spacing: 1px;">${displayValue(pnr)}</td>
              </tr>
            </table>

            <h2 style="margin: 0 0 12px; color: #172554; font-size: 18px;">Ride details</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; border-spacing: 0;">
              <tr>
                <td style="width: 50%; padding: 13px 15px; border-bottom: 1px solid #e8edf3;">
                  <div style="color: #64748b; font-size: 12px;">CAB PROVIDER</div>
                  <div style="margin-top: 4px; color: #0f172a; font-weight: 600;">${displayValue(cabVendorDetails.name)}</div>
                  <div style="margin-top: 3px; color: #64748b; font-size: 13px;">Rating: ${displayValue(cabVendorDetails.rating)} / 5</div>
                </td>
                <td style="width: 50%; padding: 13px 15px; border-bottom: 1px solid #e8edf3;">
                  <div style="color: #64748b; font-size: 12px;">VEHICLE</div>
                  <div style="margin-top: 4px; color: #0f172a; font-weight: 600;">${displayValue(cabBookingDetails.vehicleType)}</div>
                  ${selectedVehicle ? `<div style="margin-top: 3px; color: #64748b; font-size: 13px;">Capacity: ${displayValue(selectedVehicle.capacity)} passengers</div>` : ''}
                </td>
              </tr>
              <tr>
                <td style="padding: 13px 15px;">
                  <div style="color: #64748b; font-size: 12px;">PICKUP STATION</div>
                  <div style="margin-top: 4px; color: #0f172a; font-weight: 600;">${displayValue(cabBookingDetails.stationCode)}</div>
                </td>
                <td style="padding: 13px 15px;">
                  <div style="color: #64748b; font-size: 12px;">PICKUP TIME</div>
                  <div style="margin-top: 4px; color: #0f172a; font-weight: 600;">${formatDateTime(cabBookingDetails.pickupTime)}</div>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 13px 15px; border-top: 1px solid #e8edf3;">
                  <div style="color: #64748b; font-size: 12px;">DROP-OFF LOCATION</div>
                  <div style="margin-top: 4px; color: #0f172a; font-weight: 600;">${displayValue(cabBookingDetails.dropLocation)}</div>
                </td>
              </tr>
            </table>

            ${selectedVehicle ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 14px; border: 1px solid #e2e8f0; border-radius: 8px; border-spacing: 0;">
                <tr>
                  <td style="padding: 12px 15px; color: #64748b;">Base fare</td>
                  <td align="right" style="padding: 12px 15px; color: #334155;">${formatCurrency(selectedVehicle.baseFare)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border-top: 1px solid #e8edf3; color: #64748b;">Rate per km</td>
                  <td align="right" style="padding: 12px 15px; border-top: 1px solid #e8edf3; color: #334155;">${formatCurrency(selectedVehicle.pricePerKm)}</td>
                </tr>
              </table>
            ` : ''}

            <h2 style="margin: 28px 0 12px; color: #172554; font-size: 18px;">Fare and booking</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; border-spacing: 0;">
              <tr>
                <td style="padding: 12px 15px; color: #64748b;">Ride status</td>
                <td align="right" style="padding: 12px 15px; color: #047857; font-weight: 700;">${displayValue(cabBookingDetails.status)}</td>
              </tr>
              <tr>
                <td style="padding: 12px 15px; border-top: 1px solid #e8edf3; color: #64748b;">Cab reservation ID</td>
                <td align="right" style="padding: 12px 15px; border-top: 1px solid #e8edf3; color: #334155; font-size: 13px;">${displayValue(cabBookingDetails._id)}</td>
              </tr>
              <tr>
                <td style="padding: 14px 15px; border-top: 1px solid #e8edf3; color: #0f172a; font-weight: 700;">Total fare</td>
                <td align="right" style="padding: 14px 15px; border-top: 1px solid #e8edf3; color: #123b68; font-size: 18px; font-weight: 700;">${formatCurrency(cabBookingDetails.fare)}</td>
              </tr>
            </table>

            <p style="margin: 26px 0 0; color: #64748b; font-size: 12px; line-height: 1.6;">This is an automated cab booking confirmation. Please do not reply to this message.</p>
          </td>
        </tr>
      </table>
    </div>
  `;

  return sendEmail({ to: userEmail, subject, html });
};

export const sendHotelBookingConfirmation = async (
  userEmail,
  hotelBookingDetails,
  hotelDetails,
  pnr,
  guestName,
) => {
  const amenities = (hotelDetails.amenities || []).map((amenity) => `
    <span style="display: inline-block; margin: 4px 5px 4px 0; padding: 6px 9px; background-color: #f1f5f9; border-radius: 12px; color: #475569; font-size: 12px;">${displayValue(amenity)}</span>
  `).join('');
  const subject = `Hotel booking confirmed - PNR: ${pnr || 'N/A'}`;
  const html = `
    <div style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: Arial, Helvetica, sans-serif; color: #0f172a;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; border-spacing: 0; overflow: hidden;">
        <tr>
          <td style="padding: 28px 32px; background-color: #123b68; color: #ffffff;">
            <div style="font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.85;">NXT_RAIL STAY</div>
            <h1 style="margin: 10px 0 6px; font-size: 25px;">Hotel booking confirmed</h1>
            <p style="margin: 0; color: #dbeafe; font-size: 14px;">Your stay is confirmed. We look forward to hosting you.</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 26px 32px;">
            <p style="margin: 0 0 8px; font-size: 15px;">Dear ${displayValue(guestName || 'Guest')},</p>
            <p style="margin: 0 0 22px; color: #64748b; font-size: 14px; line-height: 1.6;">Your hotel reservation linked to your train booking has been confirmed.</p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 22px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; border-spacing: 0;">
              <tr>
                <td style="padding: 14px 16px; color: #475569; font-size: 13px;">TRAIN BOOKING PNR</td>
                <td align="right" style="padding: 14px 16px; color: #123b68; font-size: 20px; font-weight: 700; letter-spacing: 1px;">${displayValue(pnr)}</td>
              </tr>
            </table>

            <h2 style="margin: 0 0 12px; color: #172554; font-size: 18px;">Hotel details</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; border-spacing: 0;">
              <tr>
                <td style="width: 50%; padding: 13px 15px; border-bottom: 1px solid #e8edf3;">
                  <div style="color: #64748b; font-size: 12px;">HOTEL</div>
                  <div style="margin-top: 4px; color: #0f172a; font-weight: 600;">${displayValue(hotelDetails.name)}</div>
                </td>
                <td style="width: 50%; padding: 13px 15px; border-bottom: 1px solid #e8edf3;">
                  <div style="color: #64748b; font-size: 12px;">TYPE</div>
                  <div style="margin-top: 4px; color: #0f172a; font-weight: 600;">${displayValue(hotelDetails.type?.replace(/_/g, ' '))}</div>
                </td>
              </tr>
              <tr>
                <td style="padding: 13px 15px;">
                  <div style="color: #64748b; font-size: 12px;">STATION</div>
                  <div style="margin-top: 4px; color: #0f172a; font-weight: 600;">${displayValue(hotelDetails.stationCode)}</div>
                </td>
                <td style="padding: 13px 15px;">
                  <div style="color: #64748b; font-size: 12px;">RATING</div>
                  <div style="margin-top: 4px; color: #0f172a; font-weight: 600;">${displayValue(hotelDetails.rating)} / 5</div>
                </td>
              </tr>
            </table>
            ${amenities ? `<div style="margin-top: 14px;"><div style="margin-bottom: 5px; color: #64748b; font-size: 12px;">AMENITIES</div>${amenities}</div>` : ''}

            <h2 style="margin: 28px 0 12px; color: #172554; font-size: 18px;">Stay summary</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; border-spacing: 0;">
              <tr>
                <td style="width: 50%; padding: 13px 15px; border-bottom: 1px solid #e8edf3;">
                  <div style="color: #64748b; font-size: 12px;">CHECK-IN</div>
                  <div style="margin-top: 4px; color: #0f172a; font-weight: 600;">${formatDate(hotelBookingDetails.checkInDate)}</div>
                </td>
                <td style="width: 50%; padding: 13px 15px; border-bottom: 1px solid #e8edf3;">
                  <div style="color: #64748b; font-size: 12px;">CHECK-OUT</div>
                  <div style="margin-top: 4px; color: #0f172a; font-weight: 600;">${formatDate(hotelBookingDetails.checkOutDate)}</div>
                </td>
              </tr>
              <tr>
                <td style="padding: 13px 15px;">
                  <div style="color: #64748b; font-size: 12px;">ROOMS</div>
                  <div style="margin-top: 4px; color: #0f172a; font-weight: 600;">${displayValue(hotelBookingDetails.roomsCount)}</div>
                </td>
                <td style="padding: 13px 15px;">
                  <div style="color: #64748b; font-size: 12px;">PRICE PER NIGHT</div>
                  <div style="margin-top: 4px; color: #0f172a; font-weight: 600;">${formatCurrency(hotelDetails.pricePerNight)}</div>
                </td>
              </tr>
              <tr>
                <td style="padding: 13px 15px; border-top: 1px solid #e8edf3;">
                  <div style="color: #64748b; font-size: 12px;">BOOKING STATUS</div>
                  <div style="margin-top: 4px; color: #047857; font-weight: 700;">${displayValue(hotelBookingDetails.status)}</div>
                </td>
                <td style="padding: 13px 15px; border-top: 1px solid #e8edf3;">
                  <div style="color: #64748b; font-size: 12px;">RESERVATION ID</div>
                  <div style="margin-top: 4px; color: #334155; font-size: 13px;">${displayValue(hotelBookingDetails._id)}</div>
                </td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 14px; border: 1px solid #e2e8f0; border-radius: 8px; border-spacing: 0;">
              <tr>
                <td style="padding: 14px 15px; color: #0f172a; font-weight: 700;">Total amount</td>
                <td align="right" style="padding: 14px 15px; color: #123b68; font-size: 18px; font-weight: 700;">${formatCurrency(hotelBookingDetails.totalAmount)}</td>
              </tr>
            </table>

            <p style="margin: 26px 0 0; color: #64748b; font-size: 12px; line-height: 1.6;">This is an automated hotel booking confirmation. Please do not reply to this message.</p>
          </td>
        </tr>
      </table>
    </div>
  `;

  return sendEmail({ to: userEmail, subject, html });
};