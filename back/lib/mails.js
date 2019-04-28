const Imap = require('imap')
const inspect = require('util').inspect

const db = require('./db')


//const MailParser = require("mailparser").MailParser

function getFromName(from) {
  const names = from.trim().split(/\s+/)
  console.log('names', names)
  if (names.length > 1) {
    names.pop()
    const name = names.join(" ").replace(/"/g, "")
    if (name != '') {
      return name
    }
  }
  return getFromEmail(from)
}

function getFromEmail(from) {
  const emails = from.match(/[^@<\s]+@[^@\s]+/g)
  if( emails) {
    return emails[0].replace(/"/g, "")
  }
}

function getMailboxes(userName, name) {
  console.log('getMailboxes', userName, name)

  return db.getMailAccount(userName, name).then((account) => {

    console.log('account', account)

    return new Promise((resolve, reject) => {

      const imap = new Imap({
        user: account.user,
        password: account.pwd,
        host: account.imapHost,
        port: 993,
        tls: true
      }) 

      imap.once('ready', function() {
        imap.getBoxes(function(err, mailbox) {
          imap.end()
          if (err) {
            reject(err)
          }
          //console.log('getBoxes', mailbox)

          const ret = []
          for(let k in mailbox) {
            const {children} = mailbox[k]
            const data = {title: k}
            if (children != null) {
              data.children = Object.keys(children).map((i) => {
                return {title: i}
              })
              data.folder = true
            }
            ret.push(data)
          }

          //console.log('ret', ret)

          resolve(ret)
        })
      }) 

      imap.once("error", function(err) {
        console.log('error', err)
        reject(err)
      })

      imap.connect()       

    })


  })
   
}

function openMailbox(userName, name, mailboxName) {
  console.log('openMailbox', userName, name, mailboxName)

  return db.getMailAccount(userName, name).then((account) => {

    console.log('account', account)

    return new Promise((resolve, reject) => {

      const imap = new Imap({
        user: account.user,
        password: account.pwd,
        host: account.imapHost,
        port: 993,
        tls: true
      }) 

      imap.once('ready', function() {
        imap.openBox(mailboxName, true, function(err, mailbox) {
          if (err) {
            console.log('err', err)
            imap.end()
            reject(err)
            return
          }
          console.log('openBox', err, mailbox)
          const nbMsg = mailbox.messages.total
          console.log('nbMsg', nbMsg)
          if (nbMsg == 0) {
            imap.end()
            resolve({nbMsg, messages:[]})
          }

          // imap.search(['UNSEEN'], function(err, results) {
          //  console.log('results', results)
          // })
          const firstMsg = nbMsg
          const lastMsg = Math.max(1, nbMsg - 20)
          const query = `${firstMsg}:${lastMsg}`
          console.log('query', query)

          const messages = []

          const f = imap.seq.fetch(query, {
            bodies: ['HEADER.FIELDS (FROM SUBJECT DATE)'],
            struct: false
          })

          f.on('message', function(msg, seqno) {
            console.log('message #', seqno)

            msg.on('body', function(stream, info) {
              console.log('body', info)
              let buffer = ''
              stream.on('data', function(chunk) {
                buffer += chunk.toString('utf8')
              })
              stream.once('end', function() {
                  console.log('buffer', buffer)
                  const headers = Imap.parseHeader(buffer)
                  console.log('headers', headers)
                  messages.push({
                    from: {
                      name: getFromName(headers.from[0]),
                      email: getFromEmail(headers.from[0])
                    },
                    subject: headers.subject[0],
                    date: headers.date[0]
                  })
              })
            })
            msg.once('end', function() {
              console.log('finished !')

            })


          })

          f.once('end', function() {
            console.log('Done !')
            imap.end()
            resolve({messages, nbMsg})
          })

        })
      }) 

      imap.once("error", function(err) {
        console.log('error', err)
        reject(err)
      })

      imap.connect()       

    })


  })
   
}




module.exports = {
  getMailboxes,
  openMailbox
}