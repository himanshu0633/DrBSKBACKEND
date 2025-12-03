const mongoose = require('mongoose');

const wholesalePartnerSchema = new mongoose.Schema({
  companyName: { type: String },
  website: { type: String },
  gstNumber: { type: String, minlength: 15 },
  phone: { type: String },
  street: { type: String },
  city: { type: String },
  state: { type: String },
  zipcode: { type: String },
  country: { type: String },
  billingEmail: { type: String },
  password: { type: String },
  status: { type: String, default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WholesalePartner', wholesalePartnerSchema);
