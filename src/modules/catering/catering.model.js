import mongoose from 'mongoose';

const cateringItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true }
});

const cateringOrderSchema = new mongoose.Schema({
  bookingId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Booking', 
    required: true 
  },
  stationCode: { type: String, required: true },
  vendorId: { type: String, required: true },
  restaurantName: { type: String, required: true }, // <-- Explicitly stored here
  items: [cateringItemSchema],
  totalAmount: { type: Number, required: true },
  deliveryEta: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['PLACED', 'PREPARING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'], 
    default: 'PLACED' 
  }
}, { timestamps: true });

export const CateringOrder = mongoose.model('CateringOrder', cateringOrderSchema);