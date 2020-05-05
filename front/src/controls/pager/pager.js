
$$.control.registerControl('breizbot.pager', {

	props: {
		rootPage: ''
	},
	template: {gulp_inject: './pager.html'},

	$iface: `
		popPage(data)
		pushPage(ctrlName, options)
		setButtonVisible(buttonsVisible: {[buttonName]:boolean})
	`,

	init: function(elt) {

		const {rootPage} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				showBack: false,
				title: '',
				buttons: [],
				show1: function(scope) {
					return scope.$i.icon == undefined && !(scope.$i.visible === false)
				},
				show2: function(scope) {
					return scope.$i.icon != undefined && !(scope.$i.visible === false)
				}
			},
			events: {
				onBack: function(ev) {
					//console.log('onBack')
					restorePage(true)
				},
				onAction: function(ev) {
					const cmd = $(this).data('cmd')
					const pageCtrlIface = curInfo.ctrl.iface()
					//console.log('onAction', cmd)
					const fn = curInfo.buttons[cmd].onClick
					if (typeof fn == 'function') {
						fn.call(pageCtrlIface)
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
					curInfo.onBack()
				}
			}
			else if (typeof curInfo.onReturn == 'function') {
				curInfo.onReturn(data)
			}

			curInfo = stack.pop()
			curInfo.ctrl.show()
			const {title, buttons} = curInfo
			ctrl.setData({showBack: stack.length > 0, title, buttons: $$.util.objToArray(buttons, 'name')})

		}

		this.popPage = function(data) {
			return restorePage(false, data)
		}

		this.pushPage = function(ctrlName, options) {
			//console.log('[pager] pushPage', ctrlName, options)


			if (curInfo != null) {
				curInfo.ctrl.hide()
				stack.push(curInfo)
			}

			options = options || {}

			let {title, props, onReturn, onBack, events} = options

			const control = content.addControl(ctrlName, $.extend({$pager: this}, props), events)

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

			curInfo = {title, buttons, onReturn, onBack, ctrl: control}

			ctrl.setData({showBack: stack.length > 0, title, buttons: $$.util.objToArray(buttons, 'name')})
		}	

		this.setButtonVisible = function(buttonsVisible) {

			const {buttons} = curInfo

			for(let btn in buttonsVisible) {
				if (btn in buttons) {
					buttons[btn].visible = buttonsVisible[btn]
				}
			}
			 				
			ctrl.setData({buttons: $$.util.objToArray(buttons, 'name')})
		}


		this.pushPage(rootPage)

	}

});





