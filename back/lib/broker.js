const wildcard = require('wildcard')
const uniqid = require('uniqid')

function sendMsg(client, msg) {
	client.sendText(JSON.stringify(msg))
}

class Broker {
	constructor(userName) {
		this.clients = []
		this.userName = userName
		this.history = {}
    this.homeboxClient = null

	}

  setHomeboxClient(client) {

    console.log('[Broker] setHomeboxClient', this.userName, client.path)

    this.homeboxClient = client

    client.registeredTopics = {}

    client.on('text', (text) => {

      const msg = JSON.parse(text)
      if (msg.type == 'notif') {
        this.broadcastToSubscribers(msg)
      }

    })

    client.on('close', (code)  => {
      console.log(`homebox client disconnected`)
      this.homeboxClient = null      
    })    

    client.on('error', (err) => {
      console.log('connection error')
    })  

    this.clients.forEach((hmiClient) => {
      Object.keys(hmiClient.registeredTopics).forEach((topic) => {
        if (topic.startsWith('homebox.')) {
          if (this.homeboxClient.registeredTopics[topic] == undefined) {
            this.homeboxClient.registeredTopics[topic] = 1
            sendMsg(this.homeboxClient, {type: 'register', topic, time: Date.now()})
          }
          else {
            this.homeboxClient.registeredTopics[topic]++
          }
        }           
      })       
    })
  

    
  }

	addClient(client) {

		console.log('[Broker] addClient', this.userName, client.path)

		this.clients.push(client)

		client.registeredTopics = {}

		client.on('text', (text) => {

			const msg = JSON.parse(text)
			this.handleClientMsg(client, msg)

		})

		client.on('close', (code)  => {
			//console.log(`Client disconnected`)
			this.removeClient(client)
			
		})		

		client.on('error', (err) => {
			console.log('connection error')
		})	

    const clientId = uniqid()
    console.log('clientId', clientId)
    client.clientId = clientId
		sendMsg(client, {type: 'ready', clientId})
		

	}

	removeClient(client) {
		console.log('[Broker] removeClient', this.userName, client.path, client.clientId)

    Object.keys(client.registeredTopics).forEach((topic) => {
      if (topic.startsWith('homebox.') && this.homeboxClient != null) {
        if (this.homeboxClient.registeredTopics[topic] != undefined) {
          if (--this.homeboxClient.registeredTopics[topic] == 0) {
            delete this.homeboxClient.registeredTopics[topic]
            sendMsg(this.homeboxClient, {type: 'unregister', topic, time: Date.now()})
          }
        }
      }           
    })

		const idx = this.clients.indexOf(client)
		if (idx >= 0) {
			this.clients.splice(idx, 1)
		}
	}

  handleUnregister(client, msg) {
    const {topic} = msg

    if (client.registeredTopics[topic] != undefined) {
      //console.log(`client unsubscribes to topic '${topic}'`)
      delete client.registeredTopics[topic]
    }

    if (topic.startsWith('homebox.') && this.homeboxClient != null) {
      if (this.homeboxClient.registeredTopics[topic] != undefined) {
        if (--this.homeboxClient.registeredTopics[topic] == 0) {
          delete this.homeboxClient.registeredTopics[topic]
          sendMsg(this.homeboxClient, msg)
        }
      }
    }     
  }

  handleRegister(client, msg) {
    const {topic} = msg
    //console.log(`client subscribes to topic '${topic}'`)
    client.registeredTopics[topic] = 1

    // if (this.history[topic] != undefined) {
    //   sendMsg(client, this.history[topic])
    // }

    const msgs = wildcard(msg.topic, this.history)
    for(let i in msgs) {
      sendMsg(client, msgs[i])
    }

    if (topic.startsWith('homebox.') && this.homeboxClient != null) {
      if (this.homeboxClient.registeredTopics[topic] == undefined) {
        this.homeboxClient.registeredTopics[topic] = 1
        sendMsg(this.homeboxClient, msg)
      }
      else {
        this.homeboxClient.registeredTopics[topic]++
      }
    }    
  }

	handleClientMsg(client, msg) {

		//console.log('[Broker] msg', this.userName, client.path, msg)

		const {type, topic} = msg

		if (typeof type != 'string') {
			console.log('Missing parameter type', msg)
			return
		}	

		switch(msg.type) {

			case 'unregister':
        this.handleUnregister(client, msg)       
			break

			case 'register':
        this.handleRegister(client, msg)			
      break

			case 'notif':
        if (topic.startsWith('homebox.')) {
          if (this.homeboxClient != null) {
            sendMsg(this.homeboxClient, msg)
          }
        }
        else {
          this.broadcastToSubscribers(msg, client)
        }
			break

			default:
				console.log('Unknown msg type', type)
		}

	}	

	broadcastToSubscribers(msg, sourceClient) {
		const text = JSON.stringify(msg)
		this.clients.forEach((client) => {
      if (client == sourceClient) {
        return
      }
			// if (client.registeredTopics[msg.topic] == 1) {
			// 	client.sendText(text)
			// }
      Object.keys(client.registeredTopics).forEach((registeredTopic) => {
        if (wildcard(registeredTopic, msg.topic)) {
          client.sendText(text)
          return
        }

      })      
		})
    msg.hist = true
    this.history[msg.topic] = msg     
	}

	sendMessage(topic, data) {
		const msg = {
			time: Date.now(),
			type: 'notif',
			topic,
			data
		}	
    if (topic.startsWith('homebox.')) {
       if (this.homeboxClient != null) {
          sendMsg(this.homeboxClient, msg)
       }
    }
    else {              
      this.broadcastToSubscribers(msg)
    }		

	}

  hasClient() {
    return this.clients.length > 0
  }


}

module.exports = Broker