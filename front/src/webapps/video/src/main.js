$$.control.registerControl('rootPage', {

	deps: ['breizbot.rtc', 'breizbot.broker'],

	template: {gulp_inject: './main.html'},

	props: {
		$params: {}
	},


	init: function(elt, rtc, broker) {

		const {$params} = this.props

		const data = {
			status: 'ready',
			callee: ''
		}

		if ($params.caller != undefined) {
			data.status = 'connected',
			data.callee = $params.caller
		}

		const ctrl = $$.viewController(elt, {
			data,
			events: {
				onCall: function(ev) {
					$$.ui.showPrompt({title: 'Call', content: 'User Name:'}, function(userName){
						rtc.call(userName)
						.then(() => {
							ctrl.setData({status: 'calling', callee: userName})
						})
						.catch((e) => {
							$$.ui.showAlert({title: 'Error', content: e.responseText})
						})
					})
				},
				onCancel: function(ev) {
					rtc.cancel(ctrl.model.callee)
					.then(() => {
						ctrl.setData({status: 'canceled', callee: ''})
					})
					.catch((e) => {
						$$.ui.showAlert({title: 'Error', content: e.responseText})
					})
				}
			}
		})

		const localVideo = ctrl.scope.localVideo.get(0)
		const remoteVideo = ctrl.scope.remoteVideo.get(0)

		navigator.mediaDevices.getUserMedia({
		  audio: false,
		  video: {
		  	width: {max: elt.width()/ 2}
		  }
		})
		.then(function(stream) {
			localVideo.srcObject = stream
		})
		.catch(function(e) {
			console.log('error', e)
		  	alert('getUserMedia() error: ' + e.name);

		})

		broker.register('breizbot.rtc.accept', function(msg) {
			console.log('msg', msg)
			if (msg.hist === true) {
				return
			}
			ctrl.setData({status: 'accepted'})
		})

		broker.register('breizbot.rtc.deny', function(msg) {
			console.log('msg', msg)
			if (msg.hist === true) {
				return
			}
			ctrl.setData({status: 'refused'})

		})

	}


});




