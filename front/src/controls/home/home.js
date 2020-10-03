$$.control.registerControl('breizbot.home', {

	deps: [
		'breizbot.broker',
		'breizbot.users',
		'breizbot.notifs',
		'breizbot.geoloc',
		'breizbot.rtc',
		'breizbot.apps',
		'breizbot.scheduler',
		'breizbot.wakelock',
		'breizbot.fullscreen'
	],

	props: {
		userName: 'Unknown'
	},

	template: { gulp_inject: './home.html' },

	init: function (elt, broker, users, notifsSrv, geoloc, rtc, srvApps, scheduler, wakelock, fullscreen) {

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
						scheduler.logout()
					}
					if (data.cmd == 'apps') {
						openApp('store')
					}
					if (data.cmd == 'settings') {
						const settings = await users.getUserSettings()
						console.log('setting', settings)
						openApp('settings', settings)
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
					fullscreen.exit()
				},

				onFullScreen: function (ev) {
					//console.log('onFullScreen')
					fullscreen.enter()
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

		fullscreen.init((fullScreen) => {
			ctrl.setData({ fullScreen })
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
				$.notify(`'${userName}' is connected`, 'success')
			}
			else {
				$.notify(`'${userName}' is disconnected`, 'error')

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
			console.log('openApp', appName, params)
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

		notifsSrv.getNotifCount().then(updateNotifs)

		function loadApp() {
			srvApps.listAll().then((apps) => {
				//console.log('apps', apps)
				ctrl.setData({
					apps
				})
			})
		}


		loadApp()

		geoloc.startWatch()

		wakelock.requestWakeLock()

	}
});
