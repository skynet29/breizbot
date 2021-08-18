
$$.control.registerControl('breizbot.pager', {

	props: {
		rootPage: ''
	},
	template: { gulp_inject: './pager.html' },

	$iface: `
		popPage(data)
		pushPage(ctrlName, options)
		setButtonVisible(buttonsVisible: {[buttonName]:boolean})
		setButtonEnabled(buttonsEnabled: {[buttonName]:boolean})
	`,

	init: function (elt) {

		const { rootPage } = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				showBack: false,
				title: '',
				buttons: [],
				show1: function (scope) {
					return scope.$i.items == undefined && scope.$i.icon == undefined && !(scope.$i.visible === false)
				},
				show2: function (scope) {
					return scope.$i.items == undefined && scope.$i.icon != undefined && !(scope.$i.visible === false)
				},
				show3: function (scope) {
					return scope.$i.items != undefined && !(scope.$i.visible === false)
				},
				isEnabled(scope) {
					return scope.$i.enabled == undefined || scope.$i.enabled === true
				}
			},
			events: {
				onBack: function (ev) {
					//console.log('onBack')
					restorePage(true)
				},
				onAction: function (ev) {
					const cmd = $(this).data('cmd')
					const pageCtrlIface = curInfo.ctrl.iface()
					//console.log('onAction', cmd)
					const fn = curInfo.buttons[cmd].onClick
					if (typeof fn == 'function') {
						fn.call(pageCtrlIface)
					}
				},
				onContextMenu: function (ev, data) {
					console.log('onContextMenu', data)
					const cmd = $(this).data('cmd')
					const pageCtrlIface = curInfo.ctrl.iface()
					console.log('onAction', cmd)
					const fn = curInfo.buttons[cmd].onClick
					if (typeof fn == 'function') {
						fn.call(pageCtrlIface, data.cmd)
					}
				}
			}
		})

		const content = ctrl.scope.content
		const stack = []
		let curInfo = null


		function restorePage(isBack, data) {

			const iface = curInfo.ctrl.iface()
			//console.log('popPage', pageCtrl)
			curInfo.ctrl.safeEmpty().remove()
			if (isBack) {
				if (typeof curInfo.onBack == 'function') {
					curInfo.onBack.call(iface)
				}
			}
			else if (typeof curInfo.onReturn == 'function') {
				curInfo.onReturn.call(iface, data)
			}

			curInfo = stack.pop()
			curInfo.ctrl.show()
			const { title, buttons } = curInfo
			ctrl.setData({ showBack: stack.length > 0, title, buttons: $$.util.objToArray(buttons, 'name') })

		}

		this.popPage = function (data) {
			return restorePage(false, data)
		}

		this.pushPage = function (ctrlName, options) {
			//console.log('[pager] pushPage', ctrlName, options)


			if (curInfo != null) {
				curInfo.ctrl.hide()
				stack.push(curInfo)
			}

			options = options || {}

			let { title, props, onReturn, onBack, events } = options

			const control = content.addControl(ctrlName, props, events)

			let buttons = {}

			if (options.buttons != undefined) {
				buttons = options.buttons
			}
			else {
				const getButtons = control.iface().getButtons
				if (typeof getButtons == 'function') {
					buttons = getButtons()
				}
			}

			curInfo = { title, buttons, onReturn, onBack, ctrl: control }

			ctrl.setData({ showBack: stack.length > 0, title, buttons: $$.util.objToArray(buttons, 'name') })
			return control.iface()
		}

		this.setButtonVisible = function (buttonsVisible) {

			const { buttons } = curInfo

			for (let btn in buttonsVisible) {
				if (btn in buttons) {
					buttons[btn].visible = buttonsVisible[btn]
				}
			}

			ctrl.setData({ buttons: $$.util.objToArray(buttons, 'name') })
		}

		this.setButtonEnabled = function (buttonsEnabled) {
			//console.log('setButtonEnabled', buttonsEnabled)

			const { buttons } = curInfo

			if (typeof buttonsEnabled === 'boolean') {
				for (let btn in buttons) {
					buttons[btn].enabled = buttonsEnabled
				}

			}
			else {
				for (let btn in buttonsEnabled) {
					if (btn in buttons) {
						buttons[btn].enabled = buttonsEnabled[btn]
					}
				}

			}

			ctrl.setData({ buttons: $$.util.objToArray(buttons, 'name') })
		}

		this.pushPage(rootPage)

	}

});





