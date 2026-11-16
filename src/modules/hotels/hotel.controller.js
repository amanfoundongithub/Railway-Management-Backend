import { StationHotel, HotelBooking } from './hotel.model.js';

export const getHotelsByStation = async (req, res, next) => {
  try {
    const { stationCode } = req.params;
    const hotels = await StationHotel.find({ stationCode }).lean();
    res.status(200).json({ status: 'success', data: hotels });
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