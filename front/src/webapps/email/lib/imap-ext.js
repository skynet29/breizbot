const Imap = require('imap')
const mimemessage = require('mimemessage')


function parseStruct(struct, parts) {
    //console.log('parseStruct', struct)

    const info = struct[0]


    if (info.partID != undefined) {
        parts.push(info)
    }

    struct.slice(1).forEach((s) => {
        parseStruct(s, parts)
    })

}


function create(account) {
    //console.log('imap create', account)
    const imap = new Imap({
        user: account.user,
        password: account.pwd,
        host: account.imapHost,
        port: 993,
        tls: true,
        tlsOptions: {
            servername: account.imapHost
        }
    })

    function connect() {


        //console.log('imap connect')

        return new Promise((resolve, reject) => {

            imap.once('ready', function () {
                //console.log('event ready')
                resolve()
            })

            imap.once("error", function (err) {
                console.log('error', err)
                reject(err)
            })

            imap.once("close", function (hadError) {
                //console.log('event close', hadError)
            })

            imap.once("end", function () {
                console.log('event end')
                reject(new Error('Connection broken'))
            })

            imap.connect()

        })
    }

    function fetch(query, options, useSeq = false) {

        return new Promise((resolve, reject) => {

            options.struct = true

            const f = (useSeq) ? imap.seq.fetch(query, options) : imap.fetch(query, options)

            const ret = []

            f.on('message', function (msg, seqno) {
                //console.log('message #', seqno)
                let buffer = Buffer.alloc(0)

                msg.on('body', function (stream, info) {
                    //console.log('body', info)


                    stream.on('data', function (chunk) {
                        buffer = Buffer.concat([buffer, chunk])
                    })

                    stream.once('end', function () {


                    })

                })

                msg.once('attributes', function (attrs) {
                    //console.log('struct', attrs.struct)

                    const parts = []
                    parseStruct(attrs.struct, parts)

                    ret.push({ parts, buffer, attrs, seqno })

                })

                msg.once('end', function () {
                    //console.log('finished !')

                })


            })


            f.once('end', function () {
                console.log('Done !')
                resolve(ret)
            })

        })

    }

    function getBoxes() {
        return new Promise((resolve, reject) => {
            imap.getBoxes(function (err, mailbox) {
                //imap.end()
                if (err) {
                    reject(err)
                    return
                }
                //onsole.log('getBoxes', mailbox)
                resolve(mailbox)

            })
        })

    }

    function addBox(mailboxName) {
        return new Promise((resolve, reject) => {
            imap.addBox(mailboxName, function (err) {
                if (err) {
                    console.log('err', err)

                    reject(err)
                    return
                }
                resolve()
            })

        })
    }

    function close() {

        //console.log('imap close connection')
        return new Promise((resolve, reject) => {
            imap.end()

            imap.once("close", function (hadError) {
                resolve()
            })
    
        })
    }

    function openBox(mailboxName, readOnly) {

        //console.log('imap openBox', mailboxName, readOnly)

        return new Promise((resolve, reject) => {
            imap.openBox(mailboxName, readOnly, function (err, mailbox) {
                //console.log('openBox', err, mailbox)
                if (err) {
                    console.log('err', err)
                    imap.end()
                    reject(err)
                    return
                }

                resolve(mailbox.messages.total)

            })
        })
    }

    function closeBox() {
        return new Promise((resolve, reject) => {
            imap.closeBox(function (err) {
                //console.log('closeBox')
                if (err) {
                    console.log('err', err)
                    imap.end()
                    reject(err)
                    return
                }

                resolve()

            })
        })

    }

    function search(query) {

        return new Promise((resolve, reject) => {
            imap.search(query, function (err, results) {
                //console.log('openBox', err, mailbox)
                if (err) {
                    console.log('err', err)
                    //imap.end()
                    reject(err)
                }
                else {
                    resolve(results)
                }

                

            })
        })
    }

    function addFlags(seqNos, flags) {
        return new Promise((resolve, reject) => {

            imap.addFlags(seqNos, flags, function (err) {
                if (err) {
                    imap.end()
                    reject(err)
                    return
                }
                else {
                    imap.closeBox(true, function () {
                        resolve()
                    })
                }
            })
        })
    }

    function moveMessages(targetName, seqNos) {

        return new Promise((resolve, reject) => {

            imap.move(seqNos, targetName, function (err) {
                if (err) {
                    reject(err)
                }
                resolve()
            })
        })
    }

    function appendMessage(data) {

        return new Promise((resolve, reject) => {
            const msg = mimemessage.factory({
                contentType: 'multipart/alternate',
                body: []
            })

            const htmlEntity = mimemessage.factory({
                contentType: 'text/html;charset=utf-8',
                body: data.html.replace(/\n/g, '\r\n')
            })

            // const plainEntity = mimemessage.factory({
            //   body: data.text.replace(/\n/g, '\r\n')
            // })      

            msg.header('To', data.to)
            msg.header('Subject', data.subject)
            msg.header('From', data.from)
            msg.header('Date', new Date().toString())
            //msg.body.push(plainEntity)
            msg.body.push(htmlEntity)

            console.log('message', msg.toString())

            imap.append(msg.toString(), function (err) {
                console.log('err', err)

                if (err) {
                    reject(err)
                }
                else {
                    resolve()
                }

            })

        })

    }

    return {
        connect,
        fetch,
        search,
        getBoxes,
        addBox,
        openBox,
        closeBox,
        addFlags,
        moveMessages,
        appendMessage,
        close
    }
}



module.exports = {
    create,
    parseHeader: Imap.parseHeader
}