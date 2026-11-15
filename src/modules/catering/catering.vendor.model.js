import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  desc: { type: String },
  price: { type: Number, required: true },
  isVeg: { type: Boolean, required: true, default: true }
});

const cateringVendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  tags: { type: String },
  rating: { type: Number, default: 4.0 },
  stationCode: { type: String, required: true, index: true },
  menu: [menuItemSchema]
}, { timestamps: true });

export const CateringVendor = mongoose.model('CateringVendor', cateringVendorSchema);