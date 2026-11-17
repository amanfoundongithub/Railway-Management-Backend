import { Type } from '@google/genai';
import { Booking } from '../bookings/booking.model.js';
import { Train } from '../trains/train.model.js';
import { Station } from '../stations/station.model.js';
import { CabVendor, CabBooking } from '../cabs/cab.model.js';
import { StationHotel, HotelBooking } from '../hotels/hotel.model.js';

// Haversine helper with 1.3x urban road factor
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const deg2rad = (deg) => deg * (Math.PI / 180);
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(1, Math.round(R * c * 1.3 * 10) / 10);
};

// 1. Gemini Function Declarations
export const conciergeToolDeclarations = [
  {
    name: 'get_pnr_context',
    description: 'Fetches the passenger booking details, train info, and full station route for a 10-digit PNR number.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        pnr: { type: Type.STRING, description: '10-digit PNR number' }
      },
      required: ['pnr']
    }
  },
  {
    name: 'get_station_cabs_and_estimate',
    description: 'Fetches available cab vendors at a station and calculates the exact distance and fare to a destination address.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        stationCode: { type: Type.STRING, description: 'Station code, e.g. NDLS, HWH, SC, SBC' },
        dropLocationQuery: { type: Type.STRING, description: 'Destination landmark or area, e.g. Connaught Place, New Delhi' }
      },
      required: ['stationCode', 'dropLocationQuery']
    }
  },
  {
    name: 'book_station_cab',
    description: 'Creates a confirmed cab booking in the database after the user explicitly confirms.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        bookingId: { type: Type.STRING, description: 'MongoDB _id of the PNR Booking' },
        stationCode: { type: Type.STRING, description: 'Station code (e.g. NDLS)' },
        vendorId: { type: Type.STRING, description: 'MongoDB _id of the CabVendor' },
        vehicleType: { type: Type.STRING, description: 'Exact vehicle type string, e.g. Sedan, SUV, Auto, Hatchback' },
        dropLocation: { type: Type.STRING, description: 'Destination address string' },
        fare: { type: Type.NUMBER, description: 'Calculated total fare in INR' }
      },
      required: ['bookingId', 'stationCode', 'vendorId', 'vehicleType', 'dropLocation', 'fare']
    }
  },
  {
    name: 'get_station_hotels',
    description: 'Fetches available retiring rooms and hotels at a given railway station code.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        stationCode: { type: Type.STRING, description: 'Station code, e.g. NDLS, CSMT, MAS' }
      },
      required: ['stationCode']
    }
  },
  {
    name: 'book_station_hotel',
    description: 'Creates a confirmed hotel or retiring room reservation in the database after user confirmation.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        bookingId: { type: Type.STRING, description: 'MongoDB _id of the PNR Booking' },
        hotelId: { type: Type.STRING, description: 'MongoDB _id of the StationHotel' },
        roomsCount: { type: Type.NUMBER, description: 'Number of rooms to book' },
        nights: { type: Type.NUMBER, description: 'Number of nights for the stay' }
      },
      required: ['bookingId', 'hotelId', 'roomsCount', 'nights']
    }
  }
];

// 2. Tool Execution Handlers
export const executeConciergeTool = async (name, args) => {
  switch (name) {
    case 'get_pnr_context': {
      const booking = await Booking.findOne({ pnr: args.pnr })
        .populate('train')
        .lean();
      
      if (!booking) {
        return { error: `No booking found for PNR ${args.pnr}` };
      }

      const train = booking.train;
      return {
        bookingId: booking._id.toString(),
        pnrNumber: booking.pnrNumber,
        bookingStatus: booking.bookingStatus,
        journeyDate: booking.journeyDate,
        passengers: booking.passengers,
        train: train
          ? {
              trainId: train._id.toString(),
              trainNumber: train.trainNumber,
              trainName: train.trainName,
              route: train.route?.map((stop) => ({
                stationCode: stop.stationCode,
                stationName: stop.stationName,
                arrivalTime: stop.arrivalTime || stop.time,
                departureTime: stop.departureTime,
                status: stop.status || 'PENDING'
              }))
            }
          : null
      };
    }

    case 'get_station_cabs_and_estimate': {
      const code = args.stationCode.toUpperCase();
      const [station, vendors] = await Promise.all([
        Station.findOne({ stationCode: code }).lean(),
        CabVendor.find({ stationCode: code }).lean()
      ]);

      if (!vendors.length) {
        return { error: `No cab vendors found at station ${code}` };
      }

      const stationCoords = station?.coordinates || { lat: 28.6415, lng: 77.2208 };
      let distanceKm = 10; // Fallback 10 km
      let resolvedAddress = args.dropLocationQuery;

      try {
        const query = encodeURIComponent(`${args.dropLocationQuery}, ${station?.stationName || 'India'}`);
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
          { headers: { 'User-Agent': 'NXT_RAIL_Concierge/1.0' } }
        );
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          const dropLat = parseFloat(geoData[0].lat);
          const dropLng = parseFloat(geoData[0].lon);
          distanceKm = calculateDistanceKm(stationCoords.lat, stationCoords.lng, dropLat, dropLng);
          resolvedAddress = geoData[0].display_name.split(',').slice(0, 3).join(', ');
        }
      } catch {
        // Fallback to default 10km if Nominatim is unreachable
      }

      const options = vendors.map((v) => ({
        vendorId: v._id.toString(),
        vendorName: v.name,
        rating: v.rating,
        vehicles: v.vehicles.map((veh) => ({
          type: veh.type,
          capacity: veh.capacity,
          baseFare: veh.baseFare,
          pricePerKm: veh.pricePerKm,
          estimatedDistanceKm: distanceKm,
          estimatedTotalFare: Math.round(veh.baseFare + veh.pricePerKm * distanceKm)
        }))
      }));

      return {
        stationCode: code,
        stationName: station?.stationName || code,
        resolvedDropAddress: resolvedAddress,
        estimatedDistanceKm: distanceKm,
        vendors: options
      };
    }

    case 'book_station_cab': {
      const cabBooking = await CabBooking.create({
        bookingId: args.bookingId,
        stationCode: args.stationCode.toUpperCase(),
        vendorId: args.vendorId,
        vehicleType: args.vehicleType,
        pickupTime: new Date().toISOString(),
        dropLocation: args.dropLocation,
        fare: Number(args.fare)
      });

      return {
        status: 'CONFIRMED',
        cabBookingId: cabBooking._id.toString(),
        vehicleType: cabBooking.vehicleType,
        stationCode: cabBooking.stationCode,
        dropLocation: cabBooking.dropLocation,
        fare: cabBooking.fare
      };
    }

    case 'get_station_hotels': {
      const code = args.stationCode.toUpperCase();
      const hotels = await StationHotel.find({ stationCode: code }).lean();

      if (!hotels.length) {
        return { error: `No hotels or retiring rooms found at station ${code}` };
      }

      return {
        stationCode: code,
        hotels: hotels.map((h) => ({
          hotelId: h._id.toString(),
          name: h.name,
          type: h.type,
          pricePerNight: h.pricePerNight,
          availableRooms: h.availableRooms,
          amenities: h.amenities,
          rating: h.rating
        }))
      };
    }

    case 'book_station_hotel': {
      const hotel = await StationHotel.findById(args.hotelId);
      if (!hotel || hotel.availableRooms < args.roomsCount) {
        return { error: 'Requested rooms are not available at this property.' };
      }

      const roomsCount = Number(args.roomsCount) || 1;
      const nights = Number(args.nights) || 1;
      const totalAmount = hotel.pricePerNight * roomsCount * nights;

      hotel.availableRooms -= roomsCount;
      await hotel.save();

      const checkInDate = new Date();
      const checkOutDate = new Date(Date.now() + nights * 86400000);

      const hotelBooking = await HotelBooking.create({
        bookingId: args.bookingId,
        hotelId: hotel._id,
        checkInDate: checkInDate.toISOString(),
        checkOutDate: checkOutDate.toISOString(),
        roomsCount,
        totalAmount
      });

      return {
        status: 'CONFIRMED',
        hotelBookingId: hotelBooking._id.toString(),
        hotelName: hotel.name,
        roomsCount,
        nights,
        totalAmount
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
};