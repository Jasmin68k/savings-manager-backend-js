const mongoose = require('mongoose')
const AutoIncrementFactory = require('mongoose-sequence')
const AutoIncrement = AutoIncrementFactory(mongoose)

const moneyboxSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Moneybox name is required'],
      minlength: [1, 'Moneybox name must have at least 1 character'],
      comment: 'The name of a moneybox.'
    },
    balance: {
      type: Number,
      required: [true, 'Balance is required'],
      min: [0, 'Balance cannot be negative'],
      comment: 'The current balance of the moneybox.'
    },
    is_active: {
      type: Boolean,
      required: true,
      default: true,
      comment: 'Flag to mark instance as deleted.'
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'modified_at' }
  }
)

// As in original Python backend, allow using existing name, when is_active is false and
// treat name as case insensitive.
// Use 'en_US' locale, which at strength 2 (taking diacratics into account) works for
// German etc., too, since we're not storing/defining any specific locale/language
// in the database
moneyboxSchema.index(
  { name: 1, is_active: 1 },
  { unique: true, collation: { locale: 'en_US', strength: 2 } }
)

// To be compatible with original Python backend we use sequential integer ids instead of default MongoDB ObjectIds (_id).
moneyboxSchema.plugin(AutoIncrement, {
  id: 'moneybox_id_counter',
  inc_field: 'id'
})

const Moneybox = mongoose.model('Moneybox', moneyboxSchema)

module.exports = Moneybox
