require('dotenv').config({ path: './.env.local' })
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const Moneybox = require('./models/moneybox.js')
const Transaction = require('./models/transactions')
const { body, param, validationResult } = require('express-validator')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(bodyParser.json())

const mongoose = require('mongoose')
mongoose.set('strictQuery', false)
const mongoDB = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_CLUSTER}?retryWrites=true&w=majority&appName=${process.env.DB_APPNAME}`

main().catch((err) => console.error(err))
async function main() {
  await mongoose.connect(mongoDB)
}

const handleError = (error, res) => {
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map((err) => ({
      field: err.path,
      message: err.message
    }))
    return res.status(422).json({ message: 'Validation error', errors })
  } else if (error.name === 'MongoServerError' && error.code === 11000) {
    return res.status(405).json({
      message: `Moneybox name '${error.keyValue.name}' already exists.`,
      details: {
        name: error.keyValue.name
      }
    })
  } else if (error.name === 'MongoNetworkError') {
    // Using 503 instead of 400 (as original Python backend does), seems more appropriate
    return res.status(503).json({
      message: 'No database connection.',
      details: { message: error.message }
    })
  }
  console.error(error)
  return res.status(500).send('Internal Server Error')
}

const validateMoneyboxId = (req, res, next) => {
  const { moneybox_id } = req.params

  if (isNaN(moneybox_id) || moneybox_id < 1) {
    return res.status(422).json({
      detail: [
        {
          message: 'Moneybox ID should be a positive integer',
          input: moneybox_id
        }
      ]
    })
  }

  next()
}

const rejectExtraFields = (allowedFields) => {
  return (req, res, next) => {
    const errors = []
    const checkFields = (obj, fieldPath = '') => {
      Object.keys(obj).forEach((key) => {
        const fullPath = fieldPath ? `${fieldPath}.${key}` : key
        if (!allowedFields.includes(fullPath)) {
          errors.push(`Field '${fullPath}' is not allowed.`)
        } else if (typeof obj[key] === 'object') {
          checkFields(obj[key], fullPath)
        }
      })
    }

    checkFields(req.body)

    if (errors.length > 0) {
      return res.status(422).json({ errors: errors })
    } else {
      next()
    }
  }
}

app.get('/api/moneybox/:moneybox_id', [
  param('moneybox_id').isInt({ min: 1 }),
  validateMoneyboxId,
  async (req, res) => {
    const moneybox_id = req.params.moneybox_id

    try {
      const moneybox = await Moneybox.findOne({
        id: moneybox_id,
        is_active: true
      })

      if (!moneybox) {
        return res.status(404).json({
          message: `Moneybox with id ${moneybox_id} does not exist.`,
          details: { id: moneybox_id }
        })
      }

      res.status(200).json({
        id: moneybox.id,
        name: moneybox.name,
        balance: moneybox.balance,
        priority: moneybox.priority,
        created_at: moneybox.created_at.toISOString(),
        modified_at: moneybox.modified_at.toISOString()
      })
    } catch (error) {
      handleError(error, res)
    }
  }
])

app.patch('/api/moneybox/:moneybox_id', [
  param('moneybox_id').isInt({ min: 1 }),
  body('name')
    .optional()
    .trim()
    .escape()
    .not()
    .isEmpty()
    .withMessage('Name must not be empty'),
  body('priority')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Priority must be a positive integer'),
  validateMoneyboxId,
  rejectExtraFields(['name', 'priority']),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() })
    }

    const { moneybox_id } = req.params
    const updateData = {}
    if (req.body.name !== undefined) updateData.name = req.body.name
    if (req.body.priority !== undefined) updateData.priority = req.body.priority

    try {
      const updatedMoneybox = await Moneybox.findOneAndUpdate(
        { id: moneybox_id, is_active: true },
        updateData,
        { new: true }
      )
      if (!updatedMoneybox) {
        return res.status(404).json({
          message: `Moneybox with id ${moneybox_id} does not exist.`,
          details: { id: moneybox_id }
        })
      }

      res.status(200).json({
        id: updatedMoneybox.id,
        name: updatedMoneybox.name,
        balance: updatedMoneybox.balance,
        priority: updatedMoneybox.priority,
        created_at: updatedMoneybox.created_at.toISOString(),
        modified_at: updatedMoneybox.modified_at.toISOString()
      })
    } catch (error) {
      handleError(error, res)
    }
  }
])

app.delete('/api/moneybox/:moneybox_id', [
  param('moneybox_id').isInt({ min: 1 }),
  validateMoneyboxId,
  async (req, res) => {
    const { moneybox_id } = req.params

    try {
      // Get existing name
      const moneybox = await Moneybox.findOne({
        id: moneybox_id,
        is_active: true
      })
      if (!moneybox) {
        return res.status(404).json({
          message: `Moneybox with id ${moneybox_id} does not exist.`,
          details: { id: moneybox_id }
        })
      }

      // Create a unique identifier to append to the name
      const uniqueIdentifier = Date.now() // Using current timestamp as a unique identifier
      const newName = `${moneybox.name}_${uniqueIdentifier}`

      // Update the moneybox with the new name and set it as inactive
      const result = await Moneybox.findOneAndUpdate(
        { id: moneybox_id, is_active: true },
        {
          is_active: false,
          name: newName
        },
        { new: true }
      )

      if (!result) {
        return res.status(404).json({
          message: `Error updating Moneybox with id ${moneybox_id}.`,
          details: { id: moneybox_id }
        })
      }
      res.status(204).send()
    } catch (error) {
      handleError(error, res)
    }
  }
])

app.post('/api/moneybox', [
  body('name')
    .trim()
    .escape()
    .not()
    .isEmpty()
    .withMessage('Name must not be empty'),
  rejectExtraFields(['name']),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() })
    }

    const { name } = req.body

    // Find the highest priority moneybox that is active and set priority for new moneybox to +1
    const highestPriorityMoneybox = await Moneybox.findOne({ is_active: true })
      .sort({ priority: -1 })
      .limit(1)
    const newPriority = highestPriorityMoneybox
      ? highestPriorityMoneybox.priority + 1
      : 1

    const moneybox = new Moneybox({
      name,
      balance: 0,
      is_active: true,
      priority: newPriority
    })

    try {
      await moneybox.save()

      res.status(200).json({
        id: moneybox.id,
        name: moneybox.name,
        balance: moneybox.balance,
        priority: moneybox.priority,
        created_at: moneybox.created_at.toISOString(),
        modified_at: moneybox.modified_at.toISOString()
      })
    } catch (error) {
      handleError(error, res)
    }
  }
])

app.post('/api/moneybox/:moneybox_id/balance/add', [
  param('moneybox_id').isInt({ min: 1 }),
  body('deposit_data.amount').isInt({ min: 1 }), // Python backend uses int for amount
  body('transaction_data.description').trim().escape(),
  body('transaction_data.transaction_type').isIn(['direct', 'distribution']),
  body('transaction_data.transaction_trigger').isIn([
    'manually',
    'automatically'
  ]),
  validateMoneyboxId,
  rejectExtraFields([
    'deposit_data',
    'deposit_data.amount',
    'transaction_data',
    'transaction_data.description',
    'transaction_data.transaction_type',
    'transaction_data.transaction_trigger'
  ]),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() })
    }

    const { moneybox_id } = req.params
    const { deposit_data, transaction_data } = req.body

    try {
      const moneybox = await Moneybox.findOne({
        id: moneybox_id,
        is_active: true
      })
      if (!moneybox) {
        return res.status(404).json({
          message: `Moneybox with id ${moneybox_id} does not exist.`,
          details: { id: moneybox_id }
        })
      }

      moneybox.balance += deposit_data.amount
      await moneybox.save()

      const transaction = new Transaction({
        description: transaction_data.description,
        transaction_type: transaction_data.transaction_type,
        transaction_trigger: transaction_data.transaction_trigger,
        amount: deposit_data.amount,
        balance: moneybox.balance,
        moneybox_id: moneybox.id,
        is_active: true
      })
      await transaction.save()

      res.status(200).json({
        id: moneybox.id,
        name: moneybox.name,
        balance: moneybox.balance,
        created_at: moneybox.created_at.toISOString(),
        modified_at: moneybox.modified_at.toISOString()
      })
    } catch (error) {
      handleError(error, res)
    }
  }
])

app.post('/api/moneybox/:moneybox_id/balance/sub', [
  param('moneybox_id').isInt({ min: 1 }),
  body('withdraw_data.amount').isInt({ min: 1 }), // Python backend uses int for amount
  body('transaction_data.description').trim().escape(),
  body('transaction_data.transaction_type').isIn(['direct', 'distribution']),
  body('transaction_data.transaction_trigger').isIn([
    'manually',
    'automatically'
  ]),
  validateMoneyboxId,
  rejectExtraFields([
    'withdraw_data',
    'withdraw_data.amount',
    'transaction_data',
    'transaction_data.description',
    'transaction_data.transaction_type',
    'transaction_data.transaction_trigger'
  ]),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() })
    }

    const { moneybox_id } = req.params
    const { transaction_data, withdraw_data } = req.body

    try {
      const moneybox = await Moneybox.findOne({
        id: moneybox_id,
        is_active: true
      })
      if (!moneybox) {
        return res.status(404).json({
          message: `Moneybox with id ${moneybox_id} does not exist.`,
          details: { id: moneybox_id }
        })
      }

      if (moneybox.balance < withdraw_data.amount) {
        return res.status(405).json({
          message: `Can't sub amount '${withdraw_data.amount}' from Moneybox '${moneybox_id}'. Not enough balance to sub.`,
          details: {
            details: withdraw_data.amount,
            id: moneybox_id
          }
        })
      }

      moneybox.balance -= withdraw_data.amount
      await moneybox.save()

      const transaction = new Transaction({
        description: transaction_data.description,
        transaction_type: transaction_data.transaction_type,
        transaction_trigger: transaction_data.transaction_trigger,
        amount: -withdraw_data.amount,
        balance: moneybox.balance,
        moneybox_id: moneybox.id,
        is_active: true
      })
      await transaction.save()

      res.status(200).json({
        balance: moneybox.balance,
        created_at: moneybox.created_at.toISOString(),
        modified_at: moneybox.modified_at.toISOString(),
        id: moneybox.id,
        name: moneybox.name
      })
    } catch (error) {
      handleError(error, res)
    }
  }
])

app.post('/api/moneybox/:moneybox_id/balance/transfer', [
  param('moneybox_id').isInt({ min: 1 }),
  body('transfer_data.amount').isInt({ min: 1 }), // Python backend uses int for amount
  body('transfer_data.to_moneybox_id').isInt({ min: 1 }),
  body('transaction_data.description').trim().escape(),
  body('transaction_data.transaction_type').isIn(['direct', 'distribution']),
  body('transaction_data.transaction_trigger').isIn([
    'manually',
    'automatically'
  ]),
  validateMoneyboxId,
  rejectExtraFields([
    'transfer_data',
    'transfer_data.amount',
    'transfer_data.to_moneybox_id',
    'transaction_data',
    'transaction_data.description',
    'transaction_data.transaction_type',
    'transaction_data.transaction_trigger'
  ]),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() })
    }

    const { moneybox_id } = req.params
    const { transfer_data, transaction_data } = req.body

    const session = await mongoose.startSession()
    try {
      session.startTransaction()

      const sourceMoneybox = await Moneybox.findOne({
        id: moneybox_id,
        is_active: true
      }).session(session)
      const targetMoneybox = await Moneybox.findOne({
        id: transfer_data.to_moneybox_id,
        is_active: true
      }).session(session)

      if (!sourceMoneybox) {
        await session.abortTransaction()
        session.endSession()
        return res.status(404).json({
          message: `Moneybox with id ${moneybox_id} does not exist.`,
          details: { id: moneybox_id }
        })
      }

      if (!targetMoneybox) {
        await session.abortTransaction()
        session.endSession()
        return res.status(404).json({
          message: `Moneybox with id ${transfer_data.to_moneybox_id} does not exist.`,
          details: { id: transfer_data.to_moneybox_id }
        })
      }

      if (sourceMoneybox.balance < transfer_data.amount) {
        await session.abortTransaction()
        session.endSession()
        return res.status(405).json({
          message: `Can't sub amount '${transfer_data.amount}' from Moneybox '${moneybox_id}'. Not enough balance to sub.`,
          details: {
            details: transfer_data.amount,
            id: moneybox_id
          }
        })
      }

      sourceMoneybox.balance -= transfer_data.amount
      targetMoneybox.balance += transfer_data.amount
      await sourceMoneybox.save({ session })
      await targetMoneybox.save({ session })

      await Transaction.create(
        [
          {
            description: transaction_data.description,
            transaction_type: transaction_data.transaction_type,
            transaction_trigger: transaction_data.transaction_trigger,
            amount: -transfer_data.amount,
            balance: sourceMoneybox.balance,
            moneybox_id: sourceMoneybox.id,
            counterparty_moneybox_id: targetMoneybox.id,
            is_active: true
          },
          {
            description: transaction_data.description,
            transaction_type: transaction_data.transaction_type,
            transaction_trigger: transaction_data.transaction_trigger,
            amount: transfer_data.amount,
            balance: targetMoneybox.balance,
            moneybox_id: targetMoneybox.id,
            counterparty_moneybox_id: sourceMoneybox.id,
            is_active: true
          }
        ],
        { session }
      )

      await session.commitTransaction()
      session.endSession()

      res.status(204).end()
    } catch (error) {
      await session.abortTransaction()
      session.endSession()

      handleError(error, res)
    }
  }
])

app.get('/api/moneybox/:moneybox_id/transactions', [
  param('moneybox_id').isInt({ min: 1 }),
  validateMoneyboxId,
  async (req, res) => {
    const { moneybox_id } = req.params

    try {
      const moneybox = await Moneybox.findOne({
        id: moneybox_id,
        is_active: true
      })

      if (!moneybox) {
        return res.status(404).json({
          message: `Moneybox with id ${moneybox_id} does not exist.`,
          details: { id: moneybox_id }
        })
      }

      const transactions = await Transaction.find({
        moneybox_id: moneybox_id,
        is_active: true
      })

      if (transactions.length === 0) {
        return res.status(204).send()
      }

      const transaction_logs = transactions.map((transaction) => ({
        description: transaction.description,
        transaction_type: transaction.transaction_type,
        transaction_trigger: transaction.transaction_trigger,
        amount: transaction.amount,
        balance: transaction.balance,
        counterparty_moneybox_id: transaction.counterparty_moneybox_id,
        moneybox_id: transaction.moneybox_id
      }))

      res.status(200).json({
        total: transaction_logs.length,
        transaction_logs
      })
    } catch (error) {
      handleError(error, res)
    }
  }
])

app.get('/api/moneyboxes', async (req, res) => {
  try {
    const moneyboxes = await Moneybox.find({ is_active: true })

    if (moneyboxes.length === 0) {
      return res.status(204).send()
    }

    const formattedMoneyboxes = moneyboxes.map((moneybox) => ({
      id: moneybox.id,
      name: moneybox.name,
      balance: moneybox.balance,
      priority: moneybox.priority,
      created_at: moneybox.created_at.toISOString(),
      modified_at: moneybox.modified_at.toISOString()
    }))

    res.status(200).json({
      moneyboxes: formattedMoneyboxes,
      total: formattedMoneyboxes.length
    })
  } catch (error) {
    handleError(error, res)
  }
})

app.use((req, res) => {
  res.status(404).json({ detail: 'Not Found' })
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
