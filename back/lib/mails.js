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

function decodeHeaders(buffer) {
  console.log('decodeHeaders', buffer)
  const headers = Imap.parseHeader(buffer)
  console.log('headers', headers)
  return {
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
   const {encoding, params} = info

   console.log('body.length', body.length)

   if (encoding.toUpperCase() === 'BASE64') {
      const buff = new Buffer(body, 'base64')
     //return 'base64 encoding not supported'
     body = buff.toString('utf8')
   }

   if (encoding.toUpperCase() === 'QUOTED-PRINTABLE') {
     body = quotedPrintable.decode(body)

     body = iconv.decode(body, params.charset)

   }

  return body
}

function parseStruct(struct, parts) {
  //console.log('getInfo', struct)

  const info = struct.shift()


  if (info.partID != undefined) {
    parts.push(info)
  }

  struct.forEach((s) => {
    parseStruct(s, parts)
  })

}

function getPartIDByTYpe(parts, type, subtype) {
  const info = parts.find((p) => p.type == type && p.subtype == subtype && p.id == null)
  return (info != undefined) ? info.partID : false
}

function getPartInfo(parts, partID) {
  return parts.find((p) => p.partID == partID)
}

function getAttachments(parts) {
  console.log('getAttachments', parts)
  const ret = []
  parts.forEach((p) => {
    const {disposition, type, subtype, size, partID, encoding, id} = p
    if (disposition == null || disposition.type != 'attachment') {
      return
    }

    let name = disposition.params.filename

    if (name != undefined) {

      if (name.startsWith('=?utf-8?B?')) {
        const t = name.split('?')
        console.log('t', t)
        const buff = new Buffer(t[3], 'base64')
        //return 'base64 encoding not supported'
        name = buff.toString('utf8')
      }
      ret.push({name, type, subtype, size, partID, encoding})
    }
  })
  return ret
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

              const parts = []
              parseStruct(struct, parts)
              const partID = getPartIDByTYpe(parts, 'text', 'plain')
              const header = decodeHeaders(buffer)
              header.seqno = seqno
              header.partID = partID
              header.flags = attrs.flags
              header.nbAttachments = getAttachments(parts).length
              messages.push(header)

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

function openMessage(userName, name, mailboxName, seqNo, partID) {

  console.log('openMessage', userName, name, mailboxName, seqNo, partID)

  if (partID == false) {
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
            bodies: [`${partID}`],
            struct: true
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
                
              })
            })

            msg.once('attributes', function(attrs) {
              console.log('flags', attrs.flags)

              const {struct} = attrs
              const parts = []
              parseStruct(struct, parts)
              const info = getPartInfo(parts, partID)
              const text = decodeBody(buffer, info)
              const attachments = getAttachments(parts)

              resolve({text, attachments})
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


function openAttachment(userName, name, mailboxName, seqNo, partID) {

  console.log('openAttachment', userName, name, mailboxName, seqNo, partID)


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
            bodies: [`${partID}`],
            struct: true
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
                resolve({data: buffer})
                
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
  openMessage,
  openAttachment
}