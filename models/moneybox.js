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
    priority: {
      type: Number,
      required: [true, 'Priority is required'],
      min: [1, 'Priority cannot be negative'],
      comment: 'The current priority of the moneybox.'
    },
    is_active: {
      type: Boolean,
      required: true,
      default: true,
      comment: 'Flag to mark instance as deleted.'
    },
    is_overflow: {
      type: Boolean,
      required: true,
      default: false,
      comment: 'Flag to mark instance as overflow.'
    },
    goal: {
      type: Number,
      required: [true, 'Goal is required'],
      min: [0, 'Goal cannot be negative'],
      comment: 'The current savings goal of the moneybox.'
    },
    increment: {
      type: Number,
      required: [true, 'Increment is required'],
      min: [0, 'Increment cannot be negative'],
      comment: 'The current savings increment of the moneybox.'
    },
    no_limit: {
      type: Boolean,
      required: true,
      default: false,
      comment: 'Flag to mark moneybox as having no (limit on) savings goal.'
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'modified_at' }
  }
)

// As in original Python backend, allow using existing name, when is_active is false
moneyboxSchema.index({ name: 1, is_active: 1 }, { unique: true })

// Allow only one overflow
moneyboxSchema.index(
  { is_overflow: 1 },
  { unique: true, partialFilterExpression: { is_overflow: true } }
)

// To be compatible with original Python backend we use sequential integer ids instead of default MongoDB ObjectIds (_id).
moneyboxSchema.plugin(AutoIncrement, {
  id: 'moneybox_id_counter',
  inc_field: 'id'
})

const Moneybox = mongoose.model('Moneybox', moneyboxSchema)

module.exports = Moneybox
