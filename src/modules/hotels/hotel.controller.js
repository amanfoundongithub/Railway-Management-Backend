import { StationHotel, HotelBooking } from './hotel.model.js';
import { Train } from '../trains/train.model.js';

export const getStationsWithHotels = async (req, res, next) => {
  try {
    const { trainId } = req.params;

    const train = await Train.findById(trainId).lean();
    if (!train || !train.route || train.route.length === 0) {
      return res.status(404).json({ message: 'Train or train route not found.' });
    }

    const allHotels = await StationHotel.find({}).lean();
    
    const hotelsByStation = allHotels.reduce((acc, hotel) => {
      if (!acc[hotel.stationCode]) acc[hotel.stationCode] = [];
      acc[hotel.stationCode].push({
        id: hotel._id.toString(),
        _id: hotel._id.toString(),
        name: hotel.name,
        type: hotel.type,
        pricePerNight: hotel.pricePerNight,
        totalRooms: hotel.totalRooms,
        availableRooms: hotel.availableRooms,
        amenities: hotel.amenities,
        rating: hotel.rating
      });
      return acc;
    }, {});

    const journeyStations = train.route.map((stop) => {
      const stationHotels = hotelsByStation[stop.stationCode] || [];
      const hasHotels = stationHotels.length > 0;

      return {
        code: stop.stationCode,
        name: stop.stationName,
        status: stop.status || 'PENDING',
        time: stop.arrivalTime || stop.time,
        canBookHotel: hasHotels && stop.status !== 'DEPARTED',
        hotels: stationHotels
      };
    });

    res.status(200).json({ status: 'success', data: journeyStations });
  } catch (error) {
    next(error);
  }
};

export const bookHotel = async (req, res, next) => {
  try {
    const { bookingId, hotelId, checkInDate, checkOutDate, roomsCount, totalAmount } = req.body;

    const hotel = await StationHotel.findById(hotelId);
    if (!hotel || hotel.availableRooms < roomsCount) {
      return res.status(400).json({ status: 'fail', message: 'Requested rooms not available.' });
    }

    hotel.availableRooms -= roomsCount;
    await hotel.save();

    const hotelBooking = await HotelBooking.create({
      bookingId,
      hotelId,
      checkInDate,
      checkOutDate,
      roomsCount,
      totalAmount
    });

    res.status(201).json({ status: 'success', data: hotelBooking });
  } catch (error) {
    next(error);
  }
};

export const createHotel = async (req, res, next) => {
  try {
    const hotel = await StationHotel.create(req.body);
    res.status(201).json({ status: 'success', data: hotel });
  } catch (error) {
    next(error);
  }
};