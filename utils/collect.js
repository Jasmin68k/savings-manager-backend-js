const Moneybox = require('../models/moneybox.js')
const Transaction = require('../models/transaction.js')
const Settings = require('../models/settings.js')

async function collect() {
  console.log(`Running collect at ${new Date().toISOString()}`)
  try {
    const settings = await Settings.findById('globalSettings')
    if (!settings) throw new Error('Settings not found')

    const overflowBox = await Moneybox.findOne({ is_overflow: true })
    if (!overflowBox) throw new Error('Overflow box not found')

    overflowBox.balance += settings.savings_amount
    await overflowBox.save()

    const transaction = new Transaction({
      transaction_type: 'distribution',
      transaction_trigger: 'automatically',
      amount: settings.savings_amount,
      balance: overflowBox.balance,
      moneybox_id: overflowBox.id,
      is_active: true
    })
    await transaction.save()
    console.log('collect: Distribution completed successfully')
  } catch (error) {
    console.error('Collect operation failed:', error.message)
  }
}

module.exports = {
  run: collect
}
