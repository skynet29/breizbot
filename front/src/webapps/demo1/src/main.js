$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},


	init: function(elt) {


		const ctrl = $$.viewController(elt, {
			data: {
				sphereRotation: [0, 0, 0],
				boxPosition: [-1, 0, -3],
				position: function() {return this.boxPosition.join(' ')},
				rotation: function() {return this.sphereRotation.join(' ')}
				
			},
			events: {
			}
		})

		var timer = setInterval(function() {
			ctrl.model.sphereRotation[1] = (ctrl.model.sphereRotation[1] + 10) % 360

			ctrl.model.boxPosition[1] = (ctrl.model.boxPosition[1] + 0.5) % 3

			ctrl.update()
		}, 500)			

	}


});




