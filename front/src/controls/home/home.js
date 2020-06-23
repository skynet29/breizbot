$$.control.registerControl('breizbot.home', {

	deps: [
		'breizbot.broker',
		'breizbot.users',
		'breizbot.rtc',
		'breizbot.apps',
		'breizbot.scheduler'
	],

	props: {
		userName: 'Unknown'
	},

	template: { gulp_inject: './home.html' },

	init: function (elt, broker, users, rtc, srvApps, scheduler) {

		function createAudio() {
			let audio = null
			return {
				play: function () {
					//console.log('audio play')
					audio = new Audio('/assets/skype.mp3')
					audio.loop = true
					setTimeout(() => { audio.play() }, 100)
				},

				stop: function () {
					//console.log('audio stop')
					if (audio != null) {
						audio.pause()
					}
					audio = null
				}
			}
		}

		rtc.processCall()

		rtc.on('call', function (callInfo) {
			ctrl.setData({ hasIncomingCall: true, callInfo })
			audio.play()
		})

		rtc.on('cancel', function () {
			ctrl.setData({ hasIncomingCall: false })
			audio.stop()
		})

		const { userName } = this.props

		const audio = createAudio()

		const ctrl = $$.viewController(elt, {
			data: {
				apps: [],
				userName,
				nbNotif: 0,
				hasIncomingCall: false,
				callInfo: null,
				fullScreen: false,
				connected: false,
				hasNotif: function () {
					return this.nbNotif > 0
				},
				getMyApps: function () {
					return this.apps.filter((a) => a.activated)
				},
				items: function () {
					return {
						remove: { name: 'Remove' }
					}
				}

			},
			events: {
				onTileContextMenu: async function (ev, data) {
					//console.log('onTileContextMenu', data)
					await users.activateApp(data.appName, false)
					loadApp()
				},
				onAppClick: function (ev, data) {
					//console.log('onAppClick', data)
					openApp(data.appName)

				},
				onContextMenu: async function (ev, data) {
					//console.log('onContextMenu', data)
					if (data.cmd == 'logout') {
						logout()
					}
					if (data.cmd == 'apps') {
						openApp('store')
					}
					if (data.cmd == 'pwd') {
						const newPwd = await $$.ui.showPrompt({ title: 'Change Password', label: 'New Password:' })
						console.log('newPwd', newPwd)
						if (newPwd != null) {
							try {
								await users.changePwd(newPwd)
								$$.ui.showAlert({ title: 'Change Password', content: 'Password has been changed' })
							}
							catch (e) {
								$$.ui.showAlert({ title: 'Error', content: e.responseText })
							}
						}
					}

				},
				onNotification: function (ev) {
					//console.log('onNotification')
					if (ctrl.model.nbNotif == 0) {
						$$.ui.showAlert({ content: 'no notifications', title: 'Notifications' })
					}
					else {
						openApp('notif')
					}
				},
				onCallResponse: function (ev, data) {
					const { cmd } = data
					//console.log('onCallResponse', data)
					ctrl.setData({ hasIncomingCall: false })
					audio.stop()
					if (cmd == 'accept') {
						const { from, appName } = ctrl.model.callInfo
						openApp(appName, {
							caller: from,
							clientId: rtc.getRemoteClientId()
						})
					}
					if (cmd == 'deny') {
						rtc.deny()
					}
				},

				onExitFullScreen: function () {
					//console.log('onExitFullScreen')
					document.exitFullscreen()
				},

				onFullScreen: function (ev) {
					//console.log('onFullScreen')
					const elem = document.documentElement
					const requestFullscreen = elem.requestFullscreen ||
						elem.webkitRequestFullscreen

					if (requestFullscreen) {
						requestFullscreen.call(elem)
					}
				},
				onTabRemove: function (ev, idx) {
					//console.log('onTabRemove', idx)
					const info = ctrl.scope.tabs.getTabInfo(idx)
					info.ctrlIface.onAppExit().then(() => {
						ctrl.scope.tabs.removeTab(idx)
					})
				},
				onTabActivate: function (ev, ui) {
					//console.log('onTabActivate')
					const { newTab, oldTab } = ui
					const newTabIdx = newTab.index()
					const oldTabIdx = oldTab.index()
					if (oldTabIdx > 0) {
						const info = ctrl.scope.tabs.getTabInfo(oldTabIdx)
						info.ctrlIface.onAppSuspend()
					}
					if (newTabIdx > 0) {
						const info = ctrl.scope.tabs.getTabInfo(newTabIdx)
						info.ctrlIface.onAppResume()
					}
					if (newTabIdx == 0) {
						loadApp()
					}


				}
			}
		})

		document.addEventListener("webkitfullscreenchange", function (ev) {
			console.log('fullscreenchange', ev)
			ctrl.setData({ fullScreen: !ctrl.model.fullScreen })
		})

		document.addEventListener("fullscreenchange", function (ev) {
			console.log('fullscreenchange', ev)
			ctrl.setData({ fullScreen: !ctrl.model.fullScreen })
		})

		function updateNotifs(nbNotif) {
			ctrl.setData({ nbNotif })

		}

		broker.on('connected', (state) => {
			ctrl.setData({ connected: state })
		})

		window.addEventListener('message', (ev) => {
			console.log('[home] message', ev.data)
			const { type, data } = ev.data
			if (type == 'openApp') {
				const { appName, appParams } = data
				openApp(appName, appParams)
			}
			if (type == 'reload') {
				location.reload()
			}

		}, false)

		broker.register('breizbot.friends', (msg) => {
			//console.log('breizbot.friends', msg)
			if (msg.hist === true) {
				return
			}
			const { isConnected, userName } = msg.data
			if (isConnected) {
				$.notify(`'${userName}' is connected`,'success')
			}
			else {
				$.notify(`'${userName}' is disconnected`,'error')

			}
		})

		broker.register('breizbot.notifCount', function (msg) {
			//console.log('msg', msg)
			updateNotifs(msg.data)
		})

		broker.onTopic('breizbot.logout', function (msg) {
			location.href = '/logout'
		})


		function openApp(appName, params) {
			const appInfo = ctrl.model.apps.find((a) => a.appName == appName)
			const title = appInfo.props.title
			//console.log('openApp', appName, params)
			let idx = ctrl.scope.tabs.getTabIndexFromTitle(title)
			const appUrl = $$.util.getUrlParams(`/apps/${appName}`, params)
			if (idx < 0) { // apps not already run
				idx = ctrl.scope.tabs.addTab(title, {
					removable: true,
					control: 'breizbot.appTab',
					props: {
						appUrl
					}
				})
			}
			else {
				const info = ctrl.scope.tabs.getTabInfo(idx)
				if (params != undefined) {
					info.ctrlIface.setAppUrl(appUrl)
				}
			}

			ctrl.scope.tabs.setSelectedTabIndex(idx)

		}

		users.getNotifCount().then(updateNotifs)

		function loadApp() {
			srvApps.listAll().then((apps) => {
				//console.log('apps', apps)
				ctrl.setData({
					apps
				})
			})
		}


		function logout() {
			scheduler.logout()
		}

		loadApp()

		setInterval(sendPosition, 30 * 1000) // every 30 sec

		let coords = null

		function geoError(e) {
			console.log('geoloc error:', e)
		}

		function updateLocation(position) {
			//console.log('updateLocation', position)
			coords = position.coords
		}

		navigator.geolocation.getCurrentPosition(updateLocation)

		navigator.geolocation.watchPosition(updateLocation, geoError,
			{
				enableHighAccuracy: true
			}
		)


		function sendPosition() {
			//console.log('sendPosition', coords)
			if (coords != null) {
				users.sendPosition({
					lat: coords.latitude,
					lng: coords.longitude
				})

			}
		}

		function requestWakeLock() {
			if (navigator.wakeLock && navigator.wakeLock.request) {
				navigator.wakeLock.request('screen').then((lock) => {
					console.log('take wakeLock')
					lock.addEventListener('release', () => {
						console.log('Wake Lock was released')
					})
				})
					.catch((e) => {
						console.error('WakeLock', e)
					})

			}

		}

		function onVisibilityChange() {
			console.log('visibilitychange', document.visibilityState)
			if (document.visibilityState === 'visible') {
				requestWakeLock()
			}
		}

		document.addEventListener('visibilitychange', onVisibilityChange)

		requestWakeLock()

	}
});
