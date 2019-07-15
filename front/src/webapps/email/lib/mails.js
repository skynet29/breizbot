const Imap = require('imap')
const inspect = require('util').inspect
const  quotedPrintable = require('quoted-printable')
const iconv  = require('iconv-lite')
const nodemailer = require("nodemailer")
const addrs = require("email-addresses")
const path = require('path')
const mimemessage = require('mimemessage')

require('colors')

module.exports = function(ctx) {

  const {config} = ctx

  const cloudPath = config.CLOUD_HOME

  const db = require('./db')(ctx.db)

  function getIMap(account) {
    return new Imap({
          user: account.user,
          password: account.pwd,
          host: account.imapHost,
          port: 993,
          tls: true
        }) 
  }

  function imapConnect(userName, name, readyCallback) {
    return db.getMailAccount(userName, name).then((account) => {

      //console.log('account', account)

      return new Promise((resolve, reject) => {

        const imap = getIMap(account)

        imap.email = account.email

        imap.once('ready', function() {
          readyCallback(imap, resolve, reject)
        }) 

        imap.once("error", function(err) {
          console.log('error', err)
          reject(err)
        })

        imap.connect()       

      })


    })  
  }

  function decodeString(name) {
    name = name.trim()
    //console.log('decodeString', name)

    if (name.toUpperCase().startsWith('=?UTF-8?B?')) {
      const t = name.split('?')
      //console.log('t', t)
      const buff = new Buffer(t[3], 'base64')
      name =  buff.toString('utf8')
    }  

    if (name.toUpperCase().startsWith('=?UTF-8?Q?')) {
      const t = name.split('?')
      name = quotedPrintable.decode(t[3])

      name = iconv.decode(name, 'utf8')

    }  

    //console.log('decoded string', name)

    return name
  }


  function decodeHeaders(buffer, myEmail) {
    //console.log('decodeHeaders', buffer)
    const headers = Imap.parseHeader(buffer.toString('utf8'))
    //console.log('headers', headers)
    let addr = {
      name: 'unknown',
      address: ''
    }

    if (headers.from != undefined && headers.from[0] != undefined) {
      addr = addrs.parseOneAddress(headers.from[0])
      if (addr == null) {
        addr = {name: 'decoded error', address: ''}
      }
    }

    let to = []
    if (headers.to != undefined && headers.to[0] != undefined) {

      let addresses = addrs.parseAddressList(headers.to[0])
      if (Array.isArray(addresses)) {
        to = addresses
        .filter((a) => a.type == 'mailbox')
        .filter((a) => a.address.toUpperCase() != myEmail.toUpperCase())
        .map((a) => {return {name: a.name || a.address, email: a.address}})      
      }
      else {
        console.log('subject', headers.subject[0])
        console.warn('Bad header to', headers.to[0])
      }

    }  

    return {
      to,
      from: {
        name: addr.name || addr.address,
        email: addr.address
      },
      subject: headers.subject[0],
      date: headers.date[0]
    }
  }


  function decodeBody(body, info) {
    console.log('decodeBody', info)
     const {encoding, params} = info
     const charset = (params != null) ? params.charset : 'utf8'

     console.log('body.length', body.length)

     if (encoding.toUpperCase() === 'BASE64') {
        const buff = new Buffer(body.toString('utf8'), 'base64')
       //return 'base64 encoding not supported'
       body = iconv.decode(buff, charset)
     }

     if (encoding.toUpperCase() === 'QUOTED-PRINTABLE') {
       body = quotedPrintable.decode(body.toString('utf8'))

       body = iconv.decode(body, charset)

     }
     
     if (encoding.toUpperCase() === '8BIT') {
        const buff = new Buffer(body, 'binary')
        body = iconv.decode(buff, charset)
     }

     if (encoding.toUpperCase() === '7BIT') {
        const buff = new Buffer(body, 'ascii')
        body = iconv.decode(buff, charset)
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

  function getPartIDByType(parts, type, subtype) {
    const info = parts.find((p) => p.type == type && p.subtype == subtype && p.id == null)
    return (info != undefined) ? info.partID : false
  }

  function getPartInfo(parts, partID) {
    return parts.find((p) => p.partID == partID)
  }

  function getAttachments(parts) {
    //console.log('getAttachments', parts)
    const ret = []
    parts.forEach((p) => {
      const {disposition, type, subtype, size, partID, encoding} = p
      if (disposition == null || disposition.type.toUpperCase() != 'ATTACHMENT') {
        return
      }

      let name = disposition.params && disposition.params.filename

      if (name != undefined) {

        name = decodeString(name)

        ret.push({name, type, subtype, size, partID, encoding})
      }
    })
    return ret
  }

  function getEmbeddedImages(parts) {
    //console.log('getEmbeddedImages', parts)
    const ret = []
    parts.forEach((p) => {
      const {id, type, subtype, size, partID, encoding, disposition} = p
      if (disposition != null && disposition.type.toUpperCase() != 'INLINE') {
        return
      }
      if (id == null || type != 'image') {
        return
      }
      
      //console.log('id', id)

      let cid = id.replace(/[<>]+/g, '')


      ret.push({cid, type, subtype, size, partID, encoding})

    })
    return ret
  }

  function imapFetch(imap, query, options, callback) {

    options.struct = true

    const f = imap.seq.fetch(query, options)

   const ret = []

    f.on('message', function(msg, seqno) {
      //console.log('message #', seqno)
      let buffer = new Buffer(0)

      msg.on('body', function(stream, info) {
        //console.log('body', info)
        

        stream.on('data', function(chunk) {
          buffer = Buffer.concat([buffer, chunk])
        })

        stream.once('end', function() {
          
         
        })

      })

      msg.once('attributes', function(attrs) {
        //console.log('struct', attrs.struct)

        const parts = []
        parseStruct(attrs.struct, parts)

        ret.push({parts, buffer, attrs, seqno})

      }) 

      msg.once('end', function() {
        //console.log('finished !')

      })


    })

    f.once('end', function() {
      console.log('Done !')
      imap.end()
      callback(ret)
    })  
  }

  function getMailboxesCb(imap, resolve, reject) {
    imap.getBoxes(function(err, mailbox) {
      imap.end()
      if (err) {
        reject(err)
      }
      //onsole.log('getBoxes', mailbox)

      const ret = []
      for(let k in mailbox) {
        const {children} = mailbox[k]
        const data = {title: k, icon: 'fa fa-folder'}
        if (k.toUpperCase() == 'INBOX') {
          data.icon = 'fa fa-inbox'
        }
        else if (k.toUpperCase() == 'TRASH') {
          data.icon = 'fa fa-trash'
        }      
        if (children != null) {
          data.children = Object.keys(children).map((i) => {
            return {title: i, icon: 'fa fa-folder'}
          })
          data.folder = true
        }
        ret.push(data)
      }

      ret.sort((a, b) => {
        if (a.title.toUpperCase() == 'INBOX') {
          return -1
        }
        if (b.title.toUpperCase() == 'INBOX') {
          return 1
        }
        return a.title > b.title
      })

      //console.log('ret', ret)

      resolve(ret)
    })  
  }


  function getMailboxes(userName, name) {
    console.log('getMailboxes', userName, name)

    return imapConnect(userName, name, getMailboxesCb)
     
  }

  function addMailboxCb(mailboxName) {
    return function(imap, resolve, reject) {
      imap.addBox(mailboxName, function(err) { 
        imap.end() 
        if (err) {
          console.log('err', err)
          
          reject(err)
          return
        }
        resolve()
      })

    }
  }


  function addMailbox(userName, name, mailboxName) {
    console.log('addMailbox', userName, name, mailboxName)

    return imapConnect(userName, name, addMailboxCb(mailboxName))
  }

  const nbMsgPerPage = 20

  function openMailboxCb(mailboxName, pageNo) {

    return function(imap, resolve, reject) {
       imap.openBox(mailboxName, true, function(err, mailbox) {  
        if (err) {
          console.log('err', err)
          imap.end()
          reject(err)
          return
        }
        //console.log('openBox', err, mailbox)
        const nbMsg = mailbox.messages.total
        console.log('nbMsg', nbMsg)
        if (nbMsg == 0) {
          imap.end()
          resolve({nbMsg, messages:[]})
        }

        const firstMsg = nbMsg - (pageNo -1)*nbMsgPerPage

        const lastMsg = Math.max(1, firstMsg - nbMsgPerPage)
        const query = `${firstMsg}:${lastMsg}`
        console.log('query', query)
        imapFetch(imap, query, {bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)']}, function(data) {

          const messages = []

          data.forEach((d) => {
            const {attrs, seqno, parts, buffer} = d
            const text = getPartIDByType(parts, 'text', 'plain')
            const html = getPartIDByType(parts, 'text', 'html')
            const header = decodeHeaders(buffer, imap.email)
            header.seqno = seqno
            header.partID = {text, html}
            header.flags = attrs.flags
            header.nbAttachments = getAttachments(parts).length
            messages.push(header)

          })
          resolve({nbMsg, messages})        
        })

       })
    }

   
  }

  function openMailbox(userName, name, mailboxName, pageNo) {
    console.log('openMailbox', userName, name, mailboxName, pageNo)

    return imapConnect(userName, name, openMailboxCb(mailboxName, pageNo))

  }

  function openMessageCb(mailboxName, seqNo, partID) {

    return function(imap, resolve, reject) {

      if (partID == false) {
        resolve({text: 'plain text not available'})
        return
      }

       imap.openBox(mailboxName, false, function(err, mailbox) {  
        if (err) {
          console.log('err', err)
          imap.end()
          reject(err)
          return
        }
        //console.log('openBox', err, mailbox)
        const nbMsg = mailbox.messages.total
        console.log('nbMsg', nbMsg)

        if (seqNo > nbMsg) {
          imap.end()
          reject('seqNo out of range')
          return
        }

        imapFetch(imap, seqNo, {bodies: [partID], markSeen: true}, function(data) {

          const {parts, buffer} = data[0]
          //console.log('parts', parts)

          const info = getPartInfo(parts, partID)
          const text = decodeBody(buffer, info)
          const attachments = getAttachments(parts)
          const embeddedImages = getEmbeddedImages(parts)

          resolve({text, attachments, embeddedImages})        

        })
       
      })
    }

   
  }

  function openMessage(userName, name, mailboxName, seqNo, partID) {

    console.log('openMessage', userName, name, mailboxName, seqNo, partID)

    return imapConnect(userName, name, openMessageCb(mailboxName, seqNo, partID))

  }

  function openAttachmentCb(mailboxName, seqNo, partID) {

    return function(imap, resolve, reject) {

       imap.openBox(mailboxName, true, function(err, mailbox) {  
        if (err) {
          console.log('err', err)
          imap.end()
          reject(err)
          return
        }
        //console.log('openBox', err, mailbox)
        const nbMsg = mailbox.messages.total
        console.log('nbMsg', nbMsg)

        if (seqNo > nbMsg) {
          imap.end()
          reject('seqNo out of range')
          return
        }

        imapFetch(imap, seqNo, {bodies: [partID]}, function(data) {

          resolve({data: data[0].buffer.toString('utf8')})        

        })

      })
    }

   
  }


  function openAttachment(userName, name, mailboxName, seqNo, partID) {

    console.log('openAttachment', userName, name, mailboxName, seqNo, partID)

    return imapConnect(userName, name, openAttachmentCb(mailboxName, seqNo, partID))

  }


  function deleteMessageCb(mailboxName, seqNos) {

    return function(imap, resolve, reject) {

       imap.openBox(mailboxName, false, function(err, mailbox) {  
        if (err) {
          console.log('err', err)
          imap.end()
          reject(err)
          return
        }

        imap.seq.addFlags(seqNos, '\\Deleted', function(err) {
          if (err) {
            imap.end()
            reject(err)
          }
          else {
            imap.closeBox(true, function() {
              imap.end()
              resolve()
            })
          }
        })     
      })
    }

   
  }

  function deleteMessage(userName, name, mailboxName, seqNos) {

    console.log('deleteMessage', userName, name, mailboxName, seqNos)

    return imapConnect(userName, name, deleteMessageCb(mailboxName, seqNos))

  }


  function moveMessageCb(mailboxName, targetName, seqNos) {

    return function(imap, resolve, reject) {

       imap.openBox(mailboxName, false, function(err, mailbox) {  
        if (err) {
          console.log('err', err)
          imap.end()
          reject(err)
          return
        }

        imap.seq.move(seqNos, targetName, function(err) {
          imap.end()
          if (err) {
            reject(err)
          }
          resolve()
        })     
      })


    }

   
  }

  function moveMessage(userName, name, mailboxName, targetName, seqNos) {

    console.log('moveMessage', userName, name, mailboxName, targetName, seqNos)

    return imapConnect(userName, name, moveMessageCb(mailboxName, targetName, seqNos))

  }

  function appendMsg(account, data) {
     const imap = getIMap(account)

    return new Promise((resolve, reject) => {
      imap.once('ready', () => {
        console.log('imap ready')
        imap.openBox('Sent', false, (err, box) => {
          if (err) {
            console.log('err', err)
            imap.end()
            reject(err)
            return
          }

          const msg = mimemessage.factory({
            contentType: 'multipart/alternate',
            body: []
          })

          const plainEntity = mimemessage.factory({
            body: data.text
          })      

          msg.header('To', data.to)
          msg.header('Subject', data.subject)
          msg.header('From', data.from)
          msg.header('Date', new Date().toString())
          msg.body.push(plainEntity)

          console.log('message', msg.toString())

          imap.append(msg.toString(), function(err) {
            console.log('err', err)
             imap.end()

            if (err) {
              reject(err)
            }
            else {
              resolve()
            }

          })
         
        })
      })

      imap.once("error", function(err) {
        console.log('error', err)
        reject(err)
      })

      imap.connect()          
    })    
  }

  function sendMail(userName, accountName, data) {
    console.log('sendMail', userName, accountName)
    return db.getMailAccount(userName, accountName).then((account) => {

      //console.log('account', account)
      const transporter = nodemailer.createTransport({
        host: account.smtpHost,
        port: 587,
        secure: false,
        auth: {
          user: account.user,
          pass: account.pwd
        }
      })

      data.from = account.email

      if (data.attachments != undefined) {
          data.attachments = data.attachments.map((a) => {
            return {path: path.join(cloudPath, userName, a)}
          })
      }
      console.log('data', data)



      if (account.makeCopy == 'YES') {
        console.log('Make a copy to Sent folder')
       
        return appendMsg(account, data).then(() => {
             return transporter.sendMail(data)
        })
 
      }
      else {
        return transporter.sendMail(data)
      }
     

    })

  }

  return {
    getMailboxes,
    openMailbox,
    openMessage,
    openAttachment,
    deleteMessage,
    moveMessage,
    sendMail,
    addMailbox
  }

}
