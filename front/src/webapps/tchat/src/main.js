$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['breizbot.rtc'],

	init: function(elt, rtc) {

		rtc.on('bye', () => {
			ctrl.setData({messages: []})
		})

		const ctrl = $$.viewController(elt, {
			data: {
				messages: []				
			},
			events: {
				onSubmit: function(ev) {
					ev.preventDefault()
					const {message} = $(this).getFormData()
					$(this).resetForm()
					console.log('onSubmit', message)
					rtc.sendData('tchat', message)
					addMessage(message, true, new Date())
				},
				onHangup: function() {
					ctrl.setData({messages: []})
				}
			}
		})


		function addMessage(text, isMe, date) {
			ctrl.model.messages.push({
				text,
				me: isMe,
				time: date.toLocaleTimeString()
			})
			ctrl.update()		
			ctrl.scope.content.scrollToBottom()				
		}


		rtc.onData('tchat', function(text, time) {
			addMessage(text, false, new Date(time))
		})		

	
		rtc.on('ready', () => { 
			if (rtc.isCallee()) {
				rtc.accept()				
			}			
		})

		this.onAppExit = function() {
			return rtc.exit()
		}		


	}


});




