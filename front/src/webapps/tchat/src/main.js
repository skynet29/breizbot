$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	props: {
		$pager: null
	},

	deps: ['breizbot.rtc', 'breizbot.broker', 'breizbot.params'],

	init: function(elt, rtc, broker, params) {

		const {$pager} = this.props

		const data = {
			status: 'ready',
			distant: '',
			messages: []
		}

		if (params.caller != undefined) {
			data.status = 'connected'
			data.distant = params.caller
			rtc.setRemoteClientId(params.clientId)
		}

		const ctrl = $$.viewController(elt, {
			data,
			events: {
				onCall: function(ev) {
					console.log('onCall')

					$pager.pushPage('friendsPage', {
						title: 'Select a friend'
					})

				},
				onCancel: function(ev) {
					rtc.cancel(ctrl.model.distant)
					.then(() => {
						ctrl.setData({status: 'canceled', distant: ''})
					})
					.catch((e) => {
						$$.ui.showAlert({title: 'Error', content: e.responseText})
					})
				},
				onHangup: function(ev) {
					rtc.bye()
					ctrl.setData({status: 'ready', distant: '', messages: []})
				},
				onSubmit: function(ev) {
					ev.preventDefault()
					const {message} = $(this).getFormData()
					$(this).resetForm()
					console.log('onSubmit', message)
					rtc.sendMessage(message)
					ctrl.model.messages.push({
						text: message,
						me: true,
						time: new Date().toLocaleTimeString()
					})
					ctrl.update()
				}
			}
		})

		this.onReturn = function(userName) {
			//console.log('onReturn', userName)
			if (userName == undefined) {
				return
			}
			
			rtc.call(userName, 'tchat', 'fa fa-comments')
			.then(() => {
				ctrl.setData({status: 'calling', distant: userName})
			})
			.catch((e) => {
				$$.ui.showAlert({title: 'Error', content: e.responseText})
			})
		}	

		broker.onTopic('breizbot.rtc.accept', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			rtc.cancel(ctrl.model.distant)
			rtc.setRemoteClientId(msg.srcId)
			ctrl.setData({status: 'connected'})

		})

		broker.onTopic('breizbot.rtc.deny', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			ctrl.setData({status: 'refused'})
			rtc.cancel(ctrl.model.distant)

		})	

		broker.onTopic('breizbot.rtc.tchat', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			const date = new Date(msg.time)
			console.log('date', date)
			ctrl.model.messages.push({
				text: msg.data,
				me: false,
				time: new Date(msg.time).toLocaleTimeString()
			})
			ctrl.update()			
		})		

		broker.onTopic('breizbot.rtc.bye', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			ctrl.setData({status: 'disconnected', distant: '', messages: []})

		})			

		broker.on('ready', (msg) => { 
			rtc.setLocalClientId(msg.clientId)
			if (params.caller != undefined) {
				rtc.accept()				
			}			
		})

		window.onbeforeunload = function() {
			if (ctrl.model.status == 'connected') {
		  		rtc.bye()
			}
	
		}	

	}


});




