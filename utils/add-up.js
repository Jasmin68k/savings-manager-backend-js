const Moneybox = require('../models/moneybox.js')
const Transaction = require('../models/transaction.js')
const Settings = require('../models/settings.js')
const mongoose = require('mongoose')

async function addUp() {
  console.log(`Running add-up at ${new Date().toISOString()}`)
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

    let localSavingsAmount = settings.savings_amount
    let totalAvailableFunds = localSavingsAmount + overflowBox.balance

    if (totalAvailableFunds > 0) {
      for (const box of moneyboxes) {
        const { increment, goal, no_limit } = box
        let amountToDistribute = Math.min(increment, totalAvailableFunds)

        if (!no_limit && box.balance + amountToDistribute > goal) {
          amountToDistribute = Math.max(0, goal - box.balance)
        }

        if (amountToDistribute > 0) {
          let amountFromSavings = 0
          let amountFromOverflow = 0

          // Allocate funds from localSavingsAmount first
          if (localSavingsAmount > 0) {
            amountFromSavings = Math.min(amountToDistribute, localSavingsAmount)
            localSavingsAmount -= amountFromSavings
            totalAvailableFunds -= amountFromSavings
            box.balance += amountFromSavings
            await box.save({ session })
            await logTransaction(box, amountFromSavings, session)
          }

          // Then use the remaining needed amount from the overflow
          amountFromOverflow = amountToDistribute - amountFromSavings
          if (amountFromOverflow > 0) {
            overflowBox.balance -= amountFromOverflow
            totalAvailableFunds -= amountFromOverflow
            await overflowBox.save({ session })
            box.balance += amountFromOverflow
            await box.save({ session })
            await logTransactionWithCounterparty(
              box,
              overflowBox,
              amountFromOverflow,
              session
            )
          }
        }

        if (totalAvailableFunds <= 0) break
      }

      if (localSavingsAmount > 0) {
        overflowBox.balance += localSavingsAmount
        await overflowBox.save({ session })
        await logTransaction(overflowBox, localSavingsAmount, session)
      }
    }

    await session.commitTransaction()
    console.log('add-up: Distribution completed successfully')
  } catch (error) {
    await session.abortTransaction()
    console.error('Error in addUp:', error)
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
  run: addUp
}
