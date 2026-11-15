export const USER_ROLES = {
  PASSENGER: 'PASSENGER',           // Standard individual user booking tickets
  ADMIN: 'ADMIN',                   // Super admin managing rolling stock, routes, and global settings
  TTE: 'TTE',                       // Travel Ticket Examiner for onboard charting and verification
  STATION_MASTER: 'STATION_MASTER', // Manages live platform allocation, delays, and local station ops
  BOOKING_CLERK: 'BOOKING_CLERK',   // Railway counter staff with access to specialized quotas (e.g., HQ, VIP)
  SUPPORT: 'SUPPORT',               // Customer service agent handling grievances, refunds, and PNR tracing
  AGENT: 'AGENT',                   // Authorized B2B ticketing agents with distinct daily booking limits
  VENDOR: 'VENDOR',                 // E-catering and pantry partners managing incoming food orders
};

export const ROLE_ARRAY = Object.values(USER_ROLES);