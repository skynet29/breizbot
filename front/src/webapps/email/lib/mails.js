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
    const buff = new Buffer(t[3], 'base64')
    name = buff.toString('utf8')
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
    subject: headers.subject[0],
    date: headers.date[0]
  }
}


function decodeBody(body, info) {
  console.log('decodeBody', info)
  const { encoding, params } = info
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
    const { disposition, type, subtype, size, partID, encoding } = p
    if (disposition == null || (disposition.type.toUpperCase() != 'ATTACHMENT' && disposition.type.toUpperCase() != 'INLINE')) {
      return
    }

    let name = disposition.params && disposition.params.filename

    if (name != undefined) {

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
    if (disposition != null && disposition.type.toUpperCase() != 'INLINE') {
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

  const { config } = ctx

  const cloudPath = config.CLOUD_HOME

  const db = require('./db')(ctx.db)

  async function getMailboxes(userName, name) {
    console.log('getMailboxes', userName, name)
    const account = await db.getMailAccount(userName, name)
    const imap = Imap.create(account)
    await imap.connect()
    const boxes = await imap.getBoxes()

    const ret = []
    for (let k in boxes) {
      const { children } = boxes[k]
      const data = { title: k, icon: 'fa fa-folder' }
      if (k.toUpperCase() == 'INBOX') {
        data.icon = 'fa fa-inbox'
      }
      else if (k.toUpperCase() == 'TRASH') {
        data.icon = 'fa fa-trash'
      }
      if (children != null) {
        data.children = Object.keys(children).map((i) => {
          return { title: i, icon: 'fa fa-folder' }
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

    return ret

  }

  async function addMailbox(userName, name, mailboxName) {
    console.log('addMailbox', userName, name, mailboxName)

    const account = await db.getMailAccount(userName, name)
    const imap = Imap.create(account)
    await imap.connect()
    await imap.addBox(mailboxName)

  }

  const nbMsgPerPage = 20


  async function openMailbox(userName, name, mailboxName, pageNo) {
    console.log('openMailbox', userName, name, mailboxName, pageNo)

    const account = await db.getMailAccount(userName, name)
    const imap = Imap.create(account)
    await imap.connect()
    const nbMsg = await imap.openBox(mailboxName, true)
    if (nbMsg == 0) {
      return { nbMsg, messages: [] }
    }

    const firstMsg = nbMsg - (pageNo - 1) * nbMsgPerPage

    const lastMsg = Math.max(1, firstMsg - nbMsgPerPage)
    const query = `${firstMsg}:${lastMsg}`
    console.log('query', query)

    const data = await imap.fetch(query, { bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'] })

    const messages = []

    data.forEach((d) => {
      const { attrs, seqno, parts, buffer } = d
      const text = getPartIDByType(parts, 'text', 'plain')
      const html = getPartIDByType(parts, 'text', 'html')
      const header = decodeHeaders(buffer, account.email)
      header.seqno = seqno
      header.partID = { text, html }
      header.flags = attrs.flags
      header.nbAttachments = getAttachments(parts).length
      messages.push(header)

    })

    return { nbMsg, messages }
  }



  async function openMessage(userName, name, mailboxName, seqNo, partID) {

    console.log('openMessage', userName, name, mailboxName, seqNo, partID)

    const account = await db.getMailAccount(userName, name)
    const imap = Imap.create(account)
    await imap.connect()

    const nbMsg = await imap.openBox(mailboxName, false)

    if (seqNo > nbMsg) {
      throw ('seqNo out of range')
    }

    const data = await imap.fetch(seqNo, { bodies: [partID], markSeen: true })

    const { parts, buffer } = data[0]
    //console.log('parts', parts)

    const info = getPartInfo(parts, partID)
    const text = decodeBody(buffer, info)
    const attachments = getAttachments(parts)
    const embeddedImages = getEmbeddedImages(parts)

    return { text, attachments, embeddedImages }
  }


  async function openAttachment(userName, name, mailboxName, seqNo, partID) {

    console.log('openAttachment', userName, name, mailboxName, seqNo, partID)

    const account = await db.getMailAccount(userName, name)
    const imap = Imap.create(account)
    await imap.connect()

    const nbMsg = await imap.openBox(mailboxName, true)

    if (seqNo > nbMsg) {
      throw ('seqNo out of range')
    }

    const data = await imap.fetch(seqNo, { bodies: [partID] })

    return { data: data[0].buffer.toString('utf8') }
  }


  async function deleteMessage(userName, name, mailboxName, seqNos) {

    console.log('deleteMessage', userName, name, mailboxName, seqNos)

    const account = await db.getMailAccount(userName, name)
    const imap = Imap.create(account)
    await imap.connect()

    const nbMsg = await imap.openBox(mailboxName, false)

    await imap.addFlags(seqNos, '\\Deleted')

  }

  async function moveMessage(userName, name, mailboxName, targetName, seqNos) {

    console.log('moveMessage', userName, name, mailboxName, targetName, seqNos)

    const account = await db.getMailAccount(userName, name)
    const imap = Imap.create(account)
    await imap.connect()

    const nbMsg = await imap.openBox(mailboxName, true)

    await imap.moveMessages(targetName, seqNos)

  }

  async function appendMsg(account, data) {
    const imap = Imap.create(account)
    await imap.connect()

    await imap.openBox('Sent', false)

    await imap.appendMessage(data)

  }

  async function sendMail(userName, accountName, data) {
    console.log('sendMail', userName, accountName)

    const account = await db.getMailAccount(userName, accountName)

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
        return { path: path.join(cloudPath, userName, a) }
      })
    }
    console.log('data', data)

    if (account.makeCopy == 'YES') {
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
    addMailbox
  }

}
