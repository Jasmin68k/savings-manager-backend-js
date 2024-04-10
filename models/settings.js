const mongoose = require('mongoose')

const settingsSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: 'globalSettings'
    },
    savings_amount: {
      type: Number,
      required: [true, 'savings_amount is required'],
      min: [0, 'savings_amount cannot be negative'],
      comment: 'The current savings amount of the moneybox.'
    },
    savings_cycle: {
      type: String,
      required: true,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      comment: 'The current savings cycle of the moneybox.'
    },
    savings_mode: {
      type: String,
      required: true,
      enum: ['add-up', 'fill-envelopes', 'collect'],
      comment: 'The current savings mode of the moneybox.'
    }
  },
  // timestamps not used atm, but could be useful for future features
  {
    timestamps: true
  }
)

const Settings = mongoose.model('Settings', settingsSchema)

module.exports = Settings
