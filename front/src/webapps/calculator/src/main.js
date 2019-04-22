$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},


	init: function(elt) {

		elt.find('button').addClass('w3-btn w3-blue w3-block')
		elt.find('button.equals').removeClass('w3-blue').addClass('w3-green')
		elt.find('button.clear').removeClass('w3-blue').addClass('w3-red')

		$(document).on('keypress', (ev)=> {
			//console.log('keypress', ev.key)
			handleInput(ev.key)
		})
		let first = true

		const ctrl = $$.viewController(elt, {
			data: {
				result: ''
			},
			events: {
				onClick: function(ev) {
					let key = $(this).data('ope')

					if (key == undefined) {
						key = $(this).text()
					}

					if ($(this).hasClass('clear')) {
						key = 'Delete'
					}

					if ($(this).hasClass('equals')) {
						key = 'Enter'
					}

					handleInput(key)
				}
			}
		})

		function handleInput(key) {
			//console.log('handleInput', key)

			if (key == 'Delete') {
				ctrl.setData({result: ''})
				first = true
			}
			else if (key == 'Enter') {
				const result = $$.util.safeEval(ctrl.model.result)
				//console.log('result', result)
				ctrl.setData({result})				
				first = true
			}
			else if ('+-*/'.includes(key)) {
				ctrl.model.result += key
				first = false
				ctrl.update()
			}
			else if ('1234567890.'.includes(key)) {
				if (first) {
					if (key == '.') {
						ctrl.model.result = '0.'
					}
					else {
						ctrl.model.result = key
					}
				}
				else {
					ctrl.model.result += key
				}
				first = false
				ctrl.update()
			}	

			if (key == 'Enter')
				ctrl.scope.result.scrollLeft(0)
			else
				ctrl.scope.result.scrollLeft(10000)
		}

	}
});




