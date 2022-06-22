const Imap = require('./imap-ext')
const quotedPrintable = require('quoted-printable')
const iconv = require('iconv-lite')
const nodemailer = require("nodemailer")
const addrs = require("email-addresses")
const path = require('path')

require('colors')

function decodeString(name) {
  name = name.trim()
  //console.log('decodeString', name)

  if (name.toUpperCase().startsWith('=?UTF-8?B?')) {
    const t = name.split('?')
    //console.log('t', t)
    const buff = Buffer.from(t[3], 'base64')
    name = buff.toString('utf8')
  }

  if (name.toUpperCase().startsWith('=?ISO-8859-1?Q?')) {
    const t = name.split('?')
    name = quotedPrintable.decode(t[3])

    name = iconv.decode(Buffer.from(name), 'ISO-8859-1')
  }

  if (name.toUpperCase().startsWith('=?UTF-8?Q?')) {
    const t = name.split('?')
    name = quotedPrintable.decode(t[3])

    name = iconv.decode(Buffer.from(name), 'utf8')

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
      console.log('headers', headers.from[0])
      addr = { name: 'decoded error', address: '' }
    }
  }

  let to = []
  if (headers.to != undefined && headers.to[0] != undefined) {

    let addresses = addrs.parseAddressList(headers.to[0])
    if (Array.isArray(addresses)) {
      to = addresses
        .filter((a) => a.type == 'mailbox')
        .filter((a) => a.address.toUpperCase() != myEmail.toUpperCase())
        .map((a) => { return { name: a.name || a.address, email: a.address } })
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
    subject: (headers.subject != undefined) ? headers.subject[0] : "<Sans objet>",
    date: headers.date[0]
  }
}


function decodeBody(body, info) {
  //console.log('decodeBody', info)
  const { encoding, params } = info
  const charset = (params != null) ? params.charset : 'utf8'

  //console.log('body.length', body.length)

  if (encoding.toUpperCase() === 'BASE64') {
    const buff = Buffer.from(body.toString('utf8'), 'base64')
    //return 'base64 encoding not supported'
    body = iconv.decode(buff, charset)
  }

  if (encoding.toUpperCase() === 'QUOTED-PRINTABLE') {
    body = quotedPrintable.decode(body.toString('utf8'))

    body = iconv.decode(Buffer.from(body), charset)

  }

  if (encoding.toUpperCase() === '8BIT') {
    const buff = Buffer.from(body, 'binary')
    body = iconv.decode(buff, charset)
  }

  if (encoding.toUpperCase() === '7BIT') {
    const buff = Buffer.from(body, 'ascii')
    body = iconv.decode(buff, charset)
  }
  return body
}

function getPartIDByType(parts, type, subtype) {
  const info = parts.find((p) => p.type == type && p.subtype == subtype /*&& p.id == null*/)
  return (info != undefined) ? info.partID : false
}

function getPartInfo(parts, partID) {
  return parts.find((p) => p.partID == partID)
}

function getAttachments(parts) {
  //console.log('getAttachments', parts)
  const ret = []
  parts.forEach((p) => {
    const { id, params, disposition, type, subtype, size, partID, encoding } = p
    if (disposition == null || 
      (disposition.type.toUpperCase() != 'ATTACHMENT' && disposition.type.toUpperCase() != 'INLINE')) {
      return
    }

    // if (id != null && type == 'image') {
    //   return
    // }


    let name = disposition.params && disposition.params.filename

    if (name == null) {
      name = params && params.name
    }
    if (name != undefined && name != null) {

      name = decodeString(name)

      ret.push({ name, type, subtype, size, partID, encoding })
    }
  })
  return ret
}

function getEmbeddedImages(parts) {
  //console.log('getEmbeddedImages', parts)
  const ret = []
  parts.forEach((p) => {
    const { id, type, subtype, size, partID, encoding, disposition } = p  
    if (disposition != null &&
       disposition.type.toUpperCase() != 'INLINE' && disposition.type.toUpperCase() != 'ATTACHMENT') {
      return
    }
    if (id == null || type != 'image') {
      return
    }

    //console.log('id', id)

    let cid = id.replace(/[<>]+/g, '')


    ret.push({ cid, type, subtype, size, partID, encoding })

  })
  return ret
}


module.exports = function (ctx) {

  const db = require('./db')(ctx.db)

  async function getUnreadInboxMessages(name) {
    console.log('getUnreadInboxMessages', name)
    const account = await db.getMailAccount(name)
    const imap = Imap.create(account)
    await imap.connect()
    const boxes = await imap.getBoxes()

    for (let k in boxes) {

      if (k.toUpperCase() == 'INBOX') {
        await imap.openBox(k, true)
        const results = await imap.search(['UNSEEN'])
        console.log('results', results)
        await imap.closeBox()
        await imap.close()
        return results.length
      }
    }

    await imap.close()
  }

  async function getUnreadMessage(imap, k, data)
  {
    await imap.openBox(k, true)
    const results = await imap.search(['UNSEEN'])
    await imap.closeBox()
    console.log('results', results)
    if (results.length != 0) {
      data.title = `<strong>${k} (${results.length})</strong>`
    }  

  }

  async function getMailboxes(name, addUnseenNb = false) {
    console.log('getMailboxes', name)
    const account = await db.getMailAccount(name)
    const imap = Imap.create(account)
    await imap.connect()
    const boxes = await imap.getBoxes()

    const ret = []
    for (let k in boxes) {
      const { children } = boxes[k]
      const data = { title: k, icon: 'fa fa-folder', data: { name: k } }

      if (k.toUpperCase() == 'INBOX') {
        data.icon = 'fa fa-inbox'
        if (addUnseenNb) {
          await getUnreadMessage(imap, k, data)
        }
      }
      else if (['COMMERCIAL', 'JUNK'].includes(k.toUpperCase())) {
        if (addUnseenNb) {
          await getUnreadMessage(imap, k, data)
        }
      }
      else if (k.toUpperCase() == 'TRASH') {
        data.icon = 'fa fa-trash'
      }
      if (children != null) {
        data.children = Object.keys(children).map((i) => {
          return { title: i, icon: 'fa fa-folder',  data: { name: i } }
        })
        data.folder = true
      }
      ret.push(data)
    }

    ret.sort((a, b) => {
      if (a.data.name.toUpperCase() == 'INBOX') {
        return -1
      }
      if (b.data.name.toUpperCase() == 'INBOX') {
        return 1
      }
      return a.data.name > b.data.name
    })

    await imap.close()

    return ret

  }

  async function addMailbox(name, mailboxName) {
    console.log('addMailbox', name, mailboxName)

    const account = await db.getMailAccount(name)
    const imap = Imap.create(account)
    await imap.connect()
    await imap.addBox(mailboxName)
    await imap.close()

  }

  const nbMsgPerPage = 20


  async function openMailbox(name, mailboxName, idx) {
    console.log('openMailbox', name, mailboxName, idx)

    const account = await db.getMailAccount(name)
    const imap = Imap.create(account)
    await imap.connect()
    const nbMsg = await imap.openBox(mailboxName, true)
    if (nbMsg == 0) {
      return { nbMsg, messages: [] }
    }

    const firstMsg = nbMsg - idx + 1

    const lastMsg = Math.max(1, firstMsg - nbMsgPerPage + 1)
    const query = `${firstMsg}:${lastMsg}`
    console.log('query', query)

    const data = await imap.fetch(query, { bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'] }, true)

    const messages = []

    data.reverse().forEach((d) => {
      const { attrs, seqno, parts, buffer } = d
      const text = getPartIDByType(parts, 'text', 'plain')
      const html = getPartIDByType(parts, 'text', 'html')
      const header = decodeHeaders(buffer, account.email)
      header.seqno = attrs.uid
      header.partID = { text, html }
      header.flags = attrs.flags
      header.nbAttachments = getAttachments(parts).length
      messages.push(header)

    })

    await imap.close()

    return { nbMsg, messages }
  }



  async function openMessage(name, mailboxName, seqNo, partID) {

    console.log('openMessage', name, mailboxName, seqNo, partID)

    const account = await db.getMailAccount(name)
    const imap = Imap.create(account)
    await imap.connect()

    await imap.openBox(mailboxName, false)

    const options = { markSeen: true }

    if (partID != false) {
      options.bodies = [partID]
    }

    const data = await imap.fetch(seqNo, options)

    //console.log('data', data)
    const { parts, buffer } = data[0]
    //console.log('parts', parts)

    let text = ''

    if (partID != false)
    {
      const info = getPartInfo(parts, partID)
      text = decodeBody(buffer, info)  
    }

    //console.log('text', text)
    const attachments = getAttachments(parts)
    const embeddedImages = getEmbeddedImages(parts)

    await imap.close()

    return { text, attachments, embeddedImages }
  }


  async function openAttachment(name, mailboxName, seqNo, partID) {

    console.log('openAttachment', name, mailboxName, seqNo, partID)

    const account = await db.getMailAccount(name)
    const imap = Imap.create(account)
    await imap.connect()

    await imap.openBox(mailboxName, true)

    const data = await imap.fetch(seqNo, { bodies: [partID] })

    await imap.close()

    return { data: data[0].buffer.toString('utf8') }
  }


  async function deleteMessage(name, mailboxName, seqNos) {

    console.log('deleteMessage', name, mailboxName, seqNos)

    const account = await db.getMailAccount(name)
    const imap = Imap.create(account)
    await imap.connect()

    await imap.openBox(mailboxName, false)

    await imap.addFlags(seqNos, '\\Deleted')

    await imap.close()

  }

  async function moveMessage(name, mailboxName, targetName, seqNos) {

    console.log('moveMessage', name, mailboxName, targetName, seqNos)

    const account = await db.getMailAccount(name)
    const imap = Imap.create(account)
    await imap.connect()

    await imap.openBox(mailboxName, false)

    await imap.moveMessages(targetName, seqNos)

    await imap.close()

  }

  async function appendMsg(account, data) {
    const imap = Imap.create(account)
    await imap.connect()

    await imap.openBox('Sent', false)

    await imap.appendMessage(data)

    await imap.close()

  }

  async function sendMail(accountName, data) {
    console.log('sendMail', accountName)

    const account = await db.getMailAccount(accountName)

    const user = account.smtpUser || account.user
    const pass = account.smtpPwd || account.pwd

    //console.log('account', account)
    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: 587,
      secure: false,
      auth: {
        user,
        pass
      }
    })

    data.from = account.email

     data.attachments.forEach((a) => {
       a.path = ctx.db.getFilePath(a.path)
      })

      console.log('data', data)

    if (account.makeCopy === true) {
      console.log('Make a copy to Sent folder')

      await appendMsg(account, data)

    }

    return await transporter.sendMail(data)

  }

  return {
    getMailboxes,
    openMailbox,
    openMessage,
    openAttachment,
    deleteMessage,
    moveMessage,
    sendMail,
    addMailbox,
    getUnreadInboxMessages
  }

}
