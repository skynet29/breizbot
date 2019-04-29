const Imap = require('imap')
const inspect = require('util').inspect
const  quotedPrintable = require('quoted-printable')
const iconv  = require('iconv-lite')

require('colors')


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

function decodeHeaders(buffer, seqno, info) {
  console.log('decodeHeaders', buffer)
  const headers = Imap.parseHeader(buffer)
  console.log('headers', headers)
  return {
    info,
    seqno,
    from: {
      name: getFromName(headers.from[0]),
      email: getFromEmail(headers.from[0])
    },
    subject: headers.subject[0],
    date: headers.date[0]
  }
}


function decodeBody(body, info) {
  console.log('decodeBody', info)
   const {encoding, charset} = info

   console.log('body.length', body.length)

   if (encoding === 'BASE64') {
     return 'base64 encoding not supported'
   }

   if (encoding === 'QUOTED-PRINTABLE') {
     body = quotedPrintable.decode(body)

     body = iconv.decode(body, charset)

   }

  return body
}

function findInfo(struct, type, subtype) {
  console.log('findInfo', struct)

  const info = struct.shift()
  console.log('type', info.type)
  console.log('subtype', info.subtype)
  const {partID, encoding, params} = info
  const {charset} = params
  console.log('partID', partID)

  if (info.type == type && info.subtype == subtype) {
    return {partID, encoding, charset}
  }

  let found = null


  for(let i = 0; i < struct.length && found === null; i++) {
    found = findInfo(struct[i], type, subtype)

  }

  return found
}

function decodeMessage(buffer, struct, message){
  console.log('decodeMessage', struct, buffer.substr(0, 50).blue)

  const info = struct.shift()
  const {type, subtype, params} = info
  console.log('type', type)
  console.log('subtype', subtype)

  if (type == 'text' && subtype == 'plain') {
    message.text = decodeBody(buffer, info)
  }
  const {boundary} = params
  console.log('boundary', boundary)

  const bodies = buffer.split(boundary)
  bodies.forEach((b, i) => {
    console.log(`bodies[${i}]`, b.substr(0, 100).green
      )
  })


  struct.forEach((s, i) => {

    decodeMessage(bodies[i+1], s, message)
    // const text = decodeBody(bodies[i+1], s[0])
    // if (text !== false) {
    //   message.text = text
    // }

  })

  return message
}

function openMailbox(userName, name, mailboxName) {
  console.log('openMailbox', userName, name, mailboxName)

  return db.getMailAccount(userName, name).then((account) => {

    //console.log('account', account)

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

          const firstMsg = nbMsg
          const lastMsg = Math.max(1, nbMsg - 20)
          const query = `${firstMsg}:${lastMsg}`
          console.log('query', query)

          const messages = []

          const f = imap.seq.fetch(query, {
            bodies: ['HEADER.FIELDS (FROM SUBJECT DATE)'],
            struct: true
          })

          f.on('message', function(msg, seqno) {
            console.log('message #', seqno)
            let info
            let buffer = ''

            msg.on('body', function(stream, info) {
              console.log('body', info)
              

              stream.on('data', function(chunk) {
                buffer += chunk.toString('utf8')
              })

              stream.once('end', function() {
                
               
              })

            })

            msg.once('attributes', function(attrs) {
              const {struct} = attrs

              info = findInfo(struct, 'text', 'plain')
            }) 

            msg.once('end', function() {
              console.log('info', info)
               messages.push(decodeHeaders(buffer, seqno, info))
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

function openMessage(userName, name, mailboxName, seqNo, info) {

  console.log('openMessage', userName, name, mailboxName, seqNo, info)

  if (info == null) {
    return Promise.resolve({text: 'plain text not available'})
  }

  return db.getMailAccount(userName, name).then((account) => {

    return new Promise((resolve, reject) => {

      const imap = new Imap({
        user: account.user,
        password: account.pwd,
        host: account.imapHost,
        port: 993,
        tls: true
      }) 

     let buffer = ''

      imap.once('ready', function() {
        imap.openBox(mailboxName, true, function(err, mailbox) {
          if (err) {
            console.log('err', err)
            imap.end()
            reject(err)
            return
          }
          //console.log('openBox', err, mailbox)
          const nbMsg = mailbox.messages.total

          if (seqNo > nbMsg) {
            imap.end()
            reject('seqNo out of range')
            return
          }

          const query = `${seqNo}:${seqNo}`
          console.log('query', query)

          const f = imap.seq.fetch(query, {
            bodies: [`${info.partID}`],
            struct: false
          })

          f.on('message', function(msg) {                  

            msg.on('body', function(stream) {
              console.log('body')
             
              stream.on('data', function(chunk) {
                console.log('data', chunk.length)
                buffer += chunk.toString('utf8')
              })

              stream.once('end', function() {
                console.log('end body', buffer.length)
                resolve({text: decodeBody(buffer, info)})
              })
            })

            msg.once('end', function() {
              console.log('finished !')

            })


          })

          f.once('end', function() {
            console.log('Done !')
            
            imap.end()
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
  openMailbox,
  openMessage
}