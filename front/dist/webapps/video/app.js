$$.control.registerControl('rootPage', {

	deps: ['breizbot.rtc', 'breizbot.broker'],

	template: "<div style=\"margin: 10px;\">\n	\n	<div>\n	  <video bn-bind=\"localVideo\" autoplay muted playsinline></video>\n	  <video bn-bind=\"remoteVideo\" autoplay playsinline></video>\n	</div>\n\n	<div>\n		<button \n			bn-event=\"click: onCall\"\n			bn-show=\"status != \'calling\'\"\n			class=\"w3-btn w3-blue\">Call</button>\n\n		<button \n			bn-event=\"click: onCancel\"\n			bn-show=\"status == \'calling\'\"\n			class=\"w3-btn w3-blue\">Cancel</button>\n\n	</div>\n	<p>status: <span bn-text=\"status\"></span></p>\n	<p>Callee: <span bn-text=\"callee\"></span></p>\n\n</div>",

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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncm9vdFBhZ2UnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5ydGMnLCAnYnJlaXpib3QuYnJva2VyJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBzdHlsZT1cXFwibWFyZ2luOiAxMHB4O1xcXCI+XFxuXHRcXG5cdDxkaXY+XFxuXHQgIDx2aWRlbyBibi1iaW5kPVxcXCJsb2NhbFZpZGVvXFxcIiBhdXRvcGxheSBtdXRlZCBwbGF5c2lubGluZT48L3ZpZGVvPlxcblx0ICA8dmlkZW8gYm4tYmluZD1cXFwicmVtb3RlVmlkZW9cXFwiIGF1dG9wbGF5IHBsYXlzaW5saW5lPjwvdmlkZW8+XFxuXHQ8L2Rpdj5cXG5cXG5cdDxkaXY+XFxuXHRcdDxidXR0b24gXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNhbGxcXFwiXFxuXHRcdFx0Ym4tc2hvdz1cXFwic3RhdHVzICE9IFxcJ2NhbGxpbmdcXCdcXFwiXFxuXHRcdFx0Y2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIj5DYWxsPC9idXR0b24+XFxuXFxuXHRcdDxidXR0b24gXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNhbmNlbFxcXCJcXG5cdFx0XHRibi1zaG93PVxcXCJzdGF0dXMgPT0gXFwnY2FsbGluZ1xcJ1xcXCJcXG5cdFx0XHRjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiPkNhbmNlbDwvYnV0dG9uPlxcblxcblx0PC9kaXY+XFxuXHQ8cD5zdGF0dXM6IDxzcGFuIGJuLXRleHQ9XFxcInN0YXR1c1xcXCI+PC9zcGFuPjwvcD5cXG5cdDxwPkNhbGxlZTogPHNwYW4gYm4tdGV4dD1cXFwiY2FsbGVlXFxcIj48L3NwYW4+PC9wPlxcblxcbjwvZGl2PlwiLFxuXG5cdHByb3BzOiB7XG5cdFx0JHBhcmFtczoge31cblx0fSxcblxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgcnRjLCBicm9rZXIpIHtcblxuXHRcdGNvbnN0IHskcGFyYW1zfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGRhdGEgPSB7XG5cdFx0XHRzdGF0dXM6ICdyZWFkeScsXG5cdFx0XHRjYWxsZWU6ICcnXG5cdFx0fVxuXG5cdFx0aWYgKCRwYXJhbXMuY2FsbGVyICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0ZGF0YS5zdGF0dXMgPSAnY29ubmVjdGVkJyxcblx0XHRcdGRhdGEuY2FsbGVlID0gJHBhcmFtcy5jYWxsZXJcblx0XHR9XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhLFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQ2FsbDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHQkJC51aS5zaG93UHJvbXB0KHt0aXRsZTogJ0NhbGwnLCBjb250ZW50OiAnVXNlciBOYW1lOid9LCBmdW5jdGlvbih1c2VyTmFtZSl7XG5cdFx0XHRcdFx0XHRydGMuY2FsbCh1c2VyTmFtZSlcblx0XHRcdFx0XHRcdC50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtzdGF0dXM6ICdjYWxsaW5nJywgY2FsbGVlOiB1c2VyTmFtZX0pXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0LmNhdGNoKChlKSA9PiB7XG5cdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6IGUucmVzcG9uc2VUZXh0fSlcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25DYW5jZWw6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0cnRjLmNhbmNlbChjdHJsLm1vZGVsLmNhbGxlZSlcblx0XHRcdFx0XHQudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3N0YXR1czogJ2NhbmNlbGVkJywgY2FsbGVlOiAnJ30pXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQuY2F0Y2goKGUpID0+IHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6IGUucmVzcG9uc2VUZXh0fSlcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGNvbnN0IGxvY2FsVmlkZW8gPSBjdHJsLnNjb3BlLmxvY2FsVmlkZW8uZ2V0KDApXG5cdFx0Y29uc3QgcmVtb3RlVmlkZW8gPSBjdHJsLnNjb3BlLnJlbW90ZVZpZGVvLmdldCgwKVxuXG5cdFx0bmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoe1xuXHRcdCAgYXVkaW86IGZhbHNlLFxuXHRcdCAgdmlkZW86IHtcblx0XHQgIFx0d2lkdGg6IHttYXg6IGVsdC53aWR0aCgpLyAyfVxuXHRcdCAgfVxuXHRcdH0pXG5cdFx0LnRoZW4oZnVuY3Rpb24oc3RyZWFtKSB7XG5cdFx0XHRsb2NhbFZpZGVvLnNyY09iamVjdCA9IHN0cmVhbVxuXHRcdH0pXG5cdFx0LmNhdGNoKGZ1bmN0aW9uKGUpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdlcnJvcicsIGUpXG5cdFx0ICBcdGFsZXJ0KCdnZXRVc2VyTWVkaWEoKSBlcnJvcjogJyArIGUubmFtZSk7XG5cblx0XHR9KVxuXG5cdFx0YnJva2VyLnJlZ2lzdGVyKCdicmVpemJvdC5ydGMuYWNjZXB0JywgZnVuY3Rpb24obXNnKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y3RybC5zZXREYXRhKHtzdGF0dXM6ICdhY2NlcHRlZCd9KVxuXHRcdH0pXG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90LnJ0Yy5kZW55JywgZnVuY3Rpb24obXNnKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y3RybC5zZXREYXRhKHtzdGF0dXM6ICdyZWZ1c2VkJ30pXG5cblx0XHR9KVxuXG5cdH1cblxuXG59KTtcblxuXG5cblxuIl19
