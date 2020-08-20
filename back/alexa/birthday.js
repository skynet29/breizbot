const dbContacts = require('../db/contacts.js')

function fixe(n) {
    return (n / 100).toFixed(2).split('.')[1]
}

async function getNextBirthdayContact(userName) {

    let contacts = await dbContacts.getContacts(userName)

    contacts = contacts.filter((c) => c.birthdayNotif === true)
    //console.log('contacts', contacts)
    if (contacts.length == 0) {
        return null
    }

    const now = new Date()
    const currentYear = now.getFullYear()
    //console.log('currentYear', currentYear)

    const birthdays = contacts.map((c) => {
        const date = new Date(c.birthday)
        //console.log('year', date.getFullYear())
        date.setFullYear(currentYear)
        if (date.getTime() < now.getTime()) {
            date.setFullYear(currentYear + 1)
        }
        //console.log('date', date)
        return date.getTime() - now.getTime()
    })


    //console.log('birthdays', birthdays)
    const minDiff = Math.min(...birthdays)
    //console.log('minDiff', minDiff)
    const index = birthdays.indexOf(minDiff)
    //console.log('index', index)

    return contacts[index]
}

function getScheduledInfo(birthdayDate, remindTime) {
    const now = new Date()
    let year = now.getFullYear()
    let age = year - birthdayDate.getFullYear()
    birthdayDate.setFullYear(year)
    if (birthdayDate.getTime() < now.getTime()) {
        year += 1
        age += 1
    }

    const month = fixe(birthdayDate.getMonth() + 1)
    const day = fixe(birthdayDate.getDate())

    remindTime = remindTime.substr(0,2) + ':' + remindTime.substr(2,2)


    const scheduledTime = `${year}-${month}-${day}T${remindTime}:00.000`
    const remindDate = `????` + month + day

    return {
        scheduledTime,
        remindDate,
        age
    }

}

module.exports = {
    getNextBirthdayContact,
    getScheduledInfo
}