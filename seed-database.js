// Seeds database with test data for development and testing, deletes old data

require('dotenv').config({ path: './.env.local' })
const mongoose = require('mongoose')
const Moneybox = require('./models/moneybox.js')
const Transaction = require('./models/transaction.js')
const Settings = require('./models/settings.js')
const { run } = require('./utils/add-up.js')

const mongoDB = `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?directConnection=true&serverSelectionTimeoutMS=2000&appName=${process.env.DB_APPNAME}&replicaSet=${process.env.DB_RSNAME}`

function subMonths(date, months) {
  date.setMonth(date.getMonth() - months)
  date.setDate(1)
  return new Date(date)
}

function subDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() - days)
  return result
}

function getRandomTime() {
  const date = new Date()
  date.setHours(Math.floor(Math.random() * 24))
  date.setMinutes(Math.floor(Math.random() * 60))
  date.setSeconds(Math.floor(Math.random() * 60))
  return date
}

function selectTargetBox(moneyboxes, currentBoxId) {
  const otherMoneyboxes = moneyboxes.filter((box) => box.id !== currentBoxId)
  return otherMoneyboxes[Math.floor(Math.random() * otherMoneyboxes.length)]
}

function getRandomDescription(type) {
  const descriptions = {
    deposit: [
      'Paycheck deposit',
      'Dividend income',
      'Insurance payout',
      'Tax refund',
      'Rental income',
      'Royalties',
      'Credit card cashback',
      'Trust fund distribution'
    ],
    withdrawal: [
      'Utility bills',
      'Medical expenses',
      'Travel booking',
      'Home renovation',
      'Tech purchase',
      'Charity donation',
      'License renewal',
      'School fees'
    ],
    transfer: [
      'Savings allocation',
      'Emergency top-up',
      'Bonus investment',
      'Portfolio rebalance',
      'Funds consolidation',
      'Cash flow management',
      'Investment rebalance',
      'Budget adjustment'
    ]
  }

  return descriptions[type][
    Math.floor(Math.random() * descriptions[type].length)
  ]
}

function getRandomAmount() {
  const baseAmount = Math.floor(Math.random() * 9 + 1)
  const multipliers = [10, 100, 1000]
  const index = Math.floor(Math.random() * multipliers.length)
  return baseAmount * multipliers[index]
}

async function connectToDatabase() {
  await mongoose.connect(mongoDB)
}

// Get a list of all collections in the database and drop them
async function cleanUp() {
  const collections = await mongoose.connection.db.collections()

  for (const collection of collections) {
    console.log('Cleaning up ' + collection.collectionName)
    await collection.deleteMany({})
  }
}

async function createSettings() {
  const savings_amount = 2000
  const savings_cycle = 'monthly'
  const savings_mode = 'add-up'

  const existingSettings = await Settings.findById('globalSettings')
  if (!existingSettings) {
    // not backdating default createdAt and updatedAt, not used atm and not explicitly exposed as created_at/modifed_at in schema as with other collections
    const settings = new Settings({
      id: 'globalSettings',
      savings_amount,
      savings_cycle,
      savings_mode
    })
    await settings.save()
    console.log('Settings created with default values')
  } else {
    console.log('Settings already exist')
  }
}

async function createAndBackdateOverflow() {
  const dateSevenMonthsAgo = subMonths(new Date(), 7)
  const dateAdjusted = subDays(dateSevenMonthsAgo, 3)

  const moneybox = new Moneybox({
    name: 'OVERFLOW',
    balance: 0,
    priority: 1,
    is_active: true,
    is_overflow: true,
    goal: 0,
    increment: 0,
    no_limit: false,
    created_at: dateAdjusted,
    modified_at: dateAdjusted
  })
  await moneybox.save()

  console.log('Overflow created and backdated')
}

async function createAndBackdateMoneyboxes() {
  const names = [
    'Emergency Fund',
    'Retirement Fund',
    'Holiday Fund',
    'Education Savings',
    'Health Care Fund',
    'Vehicle Fund'
  ]
  const goals = [30000, 40000, 35000, 20000, 40000, 45000]
  const increments = [100, 200, 400, 300, 200, 600]
  const dateSevenMonthsAgo = subMonths(new Date(), 7)
  const dateAdjusted = subDays(dateSevenMonthsAgo, 2)
  let minuteCounter = 0

  for (let i = 0; i < names.length; i++) {
    const priority = i + 1
    const no_limit = Math.random() < 0.8 ? false : true

    const dateWithMinutes = new Date(dateAdjusted)
    dateWithMinutes.setMinutes(minuteCounter)

    const moneybox = new Moneybox({
      name: names[i],
      balance: 0,
      priority: priority,
      is_active: true,
      is_overflow: false,
      goal: goals[i],
      increment: increments[i],
      no_limit: no_limit,
      created_at: dateWithMinutes,
      modified_at: dateWithMinutes
    })
    await moneybox.save()
    minuteCounter += 1 // Add a minute for each moneybox created
  }
  console.log('Moneyboxes created and backdated')
}

async function createChronologicalTransactions() {
  const start = subMonths(new Date(), 7)
  const end = subDays(new Date(), 1) // Exclude current day
  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24))

  const moneyboxes = await Moneybox.find({})

  for (let day = 0; day < totalDays; day++) {
    const currentDate = subDays(end, totalDays - day - 1)
    const randomTime = getRandomTime()

    currentDate.setHours(
      randomTime.getHours(),
      randomTime.getMinutes(),
      randomTime.getSeconds()
    )

    if (moneyboxes.length > 0) {
      const box = moneyboxes[Math.floor(Math.random() * moneyboxes.length)]
      const typeChoices = ['deposit', 'withdrawal', 'transfer']
      const type = typeChoices[Math.floor(Math.random() * typeChoices.length)]
      let description, amount, transactionFrom, transactionTo, targetBox

      description = getRandomDescription(type)
      amount = getRandomAmount()

      switch (type) {
        case 'deposit':
        case 'withdrawal':
          if (type === 'withdrawal' && amount > box.balance) continue
          transactionFrom = new Transaction({
            moneybox_id: box.id,
            description,
            amount: type === 'deposit' ? amount : -amount,
            balance: box.balance + (type === 'deposit' ? amount : -amount),
            transaction_type: 'direct',
            transaction_trigger: 'manually',
            created_at: currentDate,
            modified_at: currentDate
          })
          await transactionFrom.save()
          box.balance += type === 'deposit' ? amount : -amount
          await box.save()
          break

        case 'transfer':
          if (moneyboxes.length > 1) {
            targetBox = selectTargetBox(moneyboxes, box.id)

            if (box.balance < amount) continue
            transactionFrom = new Transaction({
              moneybox_id: box.id,
              description,
              amount: -amount,
              balance: box.balance - amount,
              transaction_type: 'direct',
              transaction_trigger: 'manually',
              created_at: currentDate,
              modified_at: currentDate,
              counterparty_moneybox_id: targetBox.id,
              counterparty_moneybox_name: targetBox.name,
              counterparty_moneybox_is_overflow: targetBox.is_overflow
            })
            transactionTo = new Transaction({
              moneybox_id: targetBox.id,
              description,
              amount: amount,
              balance: targetBox.balance + amount,
              transaction_type: 'direct',
              transaction_trigger: 'manually',
              created_at: currentDate,
              modified_at: currentDate,
              counterparty_moneybox_id: box.id,
              counterparty_moneybox_name: box.name,
              counterparty_moneybox_is_overflow: box.is_overflow
            })
            await transactionFrom.save()
            await transactionTo.save()
            box.balance -= amount
            targetBox.balance += amount
            await box.save()
            await targetBox.save()
          }
          break
      }
    }
  }
  console.log('Chronological transactions created')
}

async function executeAddUp() {
  try {
    await run()
    console.log('The addUp function has completed successfully')
  } catch (error) {
    console.error('Failed to execute addUp:', error)
  }
}
async function main() {
  try {
    await connectToDatabase()
    await cleanUp()
    await createSettings()
    await createAndBackdateOverflow()
    await createAndBackdateMoneyboxes()
    await createChronologicalTransactions()
    await executeAddUp()
    console.log('All tasks completed successfully')
    process.exit(0)
  } catch (error) {
    console.error('An error occurred:', error)
    process.exit(1)
  }
}

main()
