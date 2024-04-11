const Moneybox = require('../models/moneybox.js')
const Transaction = require('../models/transaction.js')
const Settings = require('../models/settings.js')
const mongoose = require('mongoose')

async function fillEnvelopes() {
  console.log(`Running fill-envelopes at ${new Date().toISOString()}`)
  const session = await mongoose.startSession()
  try {
    session.startTransaction()
    const settings = await Settings.findById('globalSettings').session(session)
    if (!settings) throw new Error('Global settings not found.')

    const moneyboxes = await Moneybox.find({
      is_active: true,
      is_overflow: false
    })
      .sort({ priority: 1 })
      .session(session)
    const overflowBox = await Moneybox.findOne({
      is_overflow: true,
      is_active: true
    }).session(session)

    if (!overflowBox) throw new Error('Overflow box not found.')

    // First distribution pass
    if (settings.savings_amount > 0) {
      let remainingSavings = settings.savings_amount
      for (const box of moneyboxes) {
        const { increment, goal, no_limit } = box
        let amountToDistribute = Math.min(increment, remainingSavings)

        if (!no_limit && box.balance + amountToDistribute > goal) {
          amountToDistribute = Math.max(0, goal - box.balance)
        }

        if (amountToDistribute > 0) {
          box.balance += amountToDistribute
          remainingSavings -= amountToDistribute
          await box.save({ session })
          await logTransaction(box, amountToDistribute, session)
        }
        if (remainingSavings <= 0) break
      }

      // Deposit any remaining savings to overflow
      if (remainingSavings > 0) {
        overflowBox.balance += remainingSavings
        await overflowBox.save({ session })
        await logTransaction(overflowBox, remainingSavings, session)
      }
    }

    // Second Distribution Pass from Overflow
    if (overflowBox.balance > 0) {
      for (const box of moneyboxes.filter((mb) => !mb.no_limit)) {
        let amountFromOverflow = Math.min(
          overflowBox.balance,
          box.goal - box.balance
        )
        if (amountFromOverflow > 0) {
          box.balance += amountFromOverflow
          overflowBox.balance -= amountFromOverflow
          await box.save({ session })
          await overflowBox.save({ session })

          // Transaction logs for both source (overflow) and target (moneybox)
          await logTransactionWithCounterparty(
            box,
            overflowBox,
            amountFromOverflow,
            session
          )
        }
        if (overflowBox.balance <= 0) break
      }
    }

    await session.commitTransaction()
    console.log('fill-envelopes: Distribution completed successfully')
  } catch (error) {
    await session.abortTransaction()
    console.error('Error in fillEnvelopes:', error)
    throw error
  } finally {
    session.endSession()
  }
}

const logTransaction = async (moneybox, amount, session) => {
  await new Transaction({
    transaction_type: 'distribution',
    transaction_trigger: 'automatically',
    amount: amount,
    balance: moneybox.balance,
    moneybox_id: moneybox.id,
    is_active: true
  }).save({ session })
}

const logTransactionWithCounterparty = async (
  source,
  target,
  amount,
  session
) => {
  await new Transaction({
    transaction_type: 'distribution',
    transaction_trigger: 'automatically',
    amount: amount,
    balance: source.balance,
    moneybox_id: source.id,
    counterparty_moneybox_id: target.id,
    counterparty_moneybox_name: target.name,
    counterparty_moneybox_is_overflow: target.is_overflow,
    is_active: true
  }).save({ session })

  await new Transaction({
    transaction_type: 'distribution',
    transaction_trigger: 'automatically',
    amount: -amount,
    balance: target.balance,
    moneybox_id: target.id,
    counterparty_moneybox_id: source.id,
    counterparty_moneybox_name: source.name,
    counterparty_moneybox_is_overflow: source.is_overflow,
    is_active: true
  }).save({ session })
}

module.exports = {
  run: fillEnvelopes
}
