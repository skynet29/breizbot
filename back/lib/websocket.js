//@ts-check

const WebSocket = require('ws')
const url = require('url')

const servers = []
const pingInterval = 30 * 1000 // 30 sec


function addServer(startPath, onConnect) {
    console.log('add ws server', startPath)
    const wss = new WebSocket.Server({ noServer: true })
    servers.push({ wss, startPath, onConnect })
    return wss

}

function init(httpServer, store) {
    console.log('init')
    httpServer.on('upgrade', function (request, socket, head) {
        const pathname = url.parse(request.url).pathname
        console.log('upgrade', pathname)

        const foundServer = servers.find((server) => pathname.startsWith(server.startPath))

        if (foundServer) {
            const { wss, onConnect } = foundServer
            wss.handleUpgrade(request, socket, head, function (ws) {
                ws.headers = request.headers
                ws.path = pathname

                onConnect(ws, store)
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