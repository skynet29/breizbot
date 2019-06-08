$$.control.registerControl('breizbot.home', {

	deps: [
		'breizbot.broker',
		'breizbot.users',
		'breizbot.rtc',
		'breizbot.apps'
	],

	props: {
		userName: 'Unknown'
	},

	template: {gulp_inject: './home.html'},

	init: function(elt, broker, users, rtc, srvApps) {

		const {userName} = this.props

		const audio = new Audio('/assets/skype.mp3')
		audio.loop = true
	
		const ctrl = $$.viewController(elt, {
			data: {
				apps: [],
				userName,
				title: 'Home',
				isHome: true,				
				nbNotif: 0,
				hasIncomingCall: false,
				caller: '',
				fullScreen: false,
				appUrl: 'about:blank'

			},
			events: {
				onAppClick: function(ev, data) {
					console.log('onAppClick', data)
					openApp(data.props.title, data.appName)

				},				
				onContextMenu: function(ev, data) {
					console.log('onContextMenu', data)
					if (data.cmd == 'logout') {
						logout()
					}
					if (data.cmd == 'apps') {
						openApp('Store', 'store')
					}
					if (data.cmd == 'pwd') {
						$$.ui.showPrompt({title: 'Change Password', label: 'New Password:'}, function(newPwd) {
							users.changePwd(newPwd).then(() => {
								$$.ui.showAlert({title: 'Change Password', content: 'Password has been changed'})
							})
							.catch((e) => {
								$$.ui.showAlert({title: 'Error', content: e.responseText})
							})
						})
					}					

				},
				onNotification: function(ev) {
					console.log('onNotification')
					if (ctrl.model.nbNotif == 0) {
						$$.ui.showAlert({content: 'no notifications', title: 'Notifications'})
					}
					else {
						openApp('Notifications', 'notif')
					}					
				},
				onCallResponse: function(ev, data) {
					const {cmd} = data
					console.log('onCallResponse', data)
					ctrl.setData({hasIncomingCall: false})
					audio.pause()
					if (cmd == 'accept') {		
						openApp('Phone', 'video', {
							caller: ctrl.model.caller,
							clientId: rtc.getRemoteClientId()							
						})				
					}
					if (cmd == 'deny') {						
						rtc.deny()
					}
				},

				onFullScreen: function(ev) {
					console.log('onFullScreen')
					const elem = document.documentElement
					const requestFullscreen = elem.requestFullscreen ||
						elem.webkitRequestFullscreen

					if (requestFullscreen) {
						requestFullscreen.call(elem)						
					}
				},
				onGoHome: function() {
					console.log('onGoHome')
					goHome()
				}
			}
		})

		document.addEventListener("webkitfullscreenchange", function(ev) {
		  console.log('fullscreenchange', ev)
		  ctrl.setData({fullScreen: !ctrl.model.fullScreen})
		})

		document.addEventListener("fullscreenchange", function(ev) {
		  console.log('fullscreenchange', ev)
		  ctrl.setData({fullScreen: !ctrl.model.fullScreen})
		})

		function updateNotifs(nbNotif) {
			ctrl.setData({nbNotif})
		
		}

		broker.register('breizbot.notifCount', function(msg) {
			//console.log('msg', msg)
			updateNotifs(msg.data)
		})

		broker.register('breizbot.rtc.call', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			ctrl.setData({hasIncomingCall: true, caller: msg.data.from})
			rtc.setRemoteClientId(msg.srcId)
			audio.play()
		})

		broker.register('breizbot.rtc.cancel', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			ctrl.setData({hasIncomingCall: false})
			audio.pause()
		})

		function getAppUrl(appName, params) {
			let appUrl = `/apps/${appName}`

			if (typeof params == 'object') {
				const keys = []
				for(let i in params) {
					keys.push(i + '=' + params[i])
				}
		
				appUrl += `?` + keys.join('&')
			}
			return appUrl

		}

		function openApp(title, appName, params) {
			console.log('openApp', title, appName, params)
			saveData().then(() => {
				ctrl.setData({
					isHome: false, 
					title,
					appUrl: getAppUrl(appName, params)
				})							
			})

		}

		users.getNotifCount().then(updateNotifs)

		function loadApp() {
			srvApps.listMyApp().then((apps) => {
				console.log('apps', apps)
				ctrl.setData({
					apps,
					isHome: true,
					title: 'Home',
					appUrl:'about:blank'
				})
			})			
		}

		function saveData() {
			console.log('[System] saveData')
			if (!ctrl.model.isHome)	{
				const $iframe = $(ctrl.scope.iframe.get(0).contentWindow.document)
				const rootPage = $iframe.find('.rootPage').iface()
				console.log('rootPage', rootPage)
				if (typeof rootPage.exitApp == 'function') {
					const ret = rootPage.exitApp()
					if (ret instanceof Promise) {
						return ret
					}
				}
			}
			return Promise.resolve()		
		}

		function goHome() {
			saveData().then(loadApp)				
		}

		function logout() {
			saveData().then(() => {
				location.href = '/logout'
			})			
		}

		loadApp()	
		

	}
});
