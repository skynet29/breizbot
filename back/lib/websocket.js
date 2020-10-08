//@ts-check

const WebSocket = require('ws')
const url = require('url')
const cookie = require('cookie')

const servers = []
const pingInterval = 30 * 1000 // 30 sec


function addServer(startPath, findUserFromSid, onConnect) {
    console.log('add ws server', startPath)
    const wss = new WebSocket.Server({ noServer: true })
    servers.push({ wss, startPath, onConnect, findUserFromSid })
    return wss

}

function findUser(client, store) {
    //console.log('findUserFromSid')

    return new Promise((resolve, reject) => {
        const { headers } = client
        //console.log('onConnect', path)

        if (headers.cookie == undefined) {
            reject('Missing cookie')
        }

        const cookies = cookie.parse(headers.cookie)
        //console.log('cookies', cookies)

        let sid = cookies['connect.sid']
        if (sid == undefined) {
            reject('Missing sid')
        }

        sid = sid.split(/[:.]+/)[1]
        //console.log('sid', sid)

        store.get(sid, function (err, session) {
            //console.log('err', err)
            //console.log('session', session)
            if (err != null || session == null) {
                reject('Unknown session')
            }
            client.sessionId = sid
            resolve(session.user)

        })
    })    
        
}

function init(httpServer, store) {
    console.log('init')
    httpServer.on('upgrade', function (request, socket, head) {
        const pathname = url.parse(request.url).pathname
        console.log('upgrade', pathname)

        const foundServer = servers.find((server) => pathname.startsWith(server.startPath))

        if (foundServer) {
            const { wss, onConnect, findUserFromSid } = foundServer
            wss.handleUpgrade(request, socket, head, async function (ws) {
                ws.headers = request.headers
                ws.path = pathname

                if (findUserFromSid) {
                    try {
                        const userName = await findUser(ws, store)
                        onConnect(ws, userName)
                    }
                    catch(e) {
                        console.error(e)
                    }
                }
    
            })

        } else {
            console.log('No server found')
            socket.destroy()
        }
    })

    checkBrokenConnections()

}

function checkBrokenConnections() {
    setInterval(() => {
        //console.log('checkBrokenConnections')
        const now = Date.now()
        servers.forEach((server) => {
            server.wss.clients.forEach((client) => {
                if ((now - client.lastPingDate) > pingInterval) {
                    client.close()
                }
            })
        })
    }, pingInterval)
}

function sendMsg(client, msg) {
    //console.log('[Broker] sendMsg', msg)
    if (client == undefined) {
        return
    }
    msg.time = Date.now()
    client.send(JSON.stringify(msg))
}



function sendError(client, text) {
    console.log('sendError', text)
    sendMsg(client, { type: 'error', text })
}

function sendPong(client) {
    client.lastPingDate = Date.now()
    sendMsg(client, { type: 'pong' })

}

function sendNotif(client, topic, data) {
    sendMsg(client, { type: 'notif', topic, data })
}


function registerTopic(client, topic) {
    console.log('registerTopic', client.userName, topic)
    sendMsg(client, { type: 'register', topic })

}

function unregisterTopic(client, topic) {
    console.log('unregisterTopic', client.userName, topic)
    sendMsg(client, { type: 'unregister', topic })

}

module.exports = {
    addServer,
    init,
    sendError,
    sendMsg,
    sendPong,
    sendNotif,
    registerTopic,
    unregisterTopic
}