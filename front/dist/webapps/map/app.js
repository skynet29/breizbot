$$.control.registerControl('breizbot.main', {

	deps: ['breizbot.broker'],

	template: "<div bn-control=\"brainjs.map\" \n	style=\"height: 100%\"\n	bn-iface=\"map\"\n	bn-data=\"{\n		center: {lat: 48.39, lng: -4.486},\n		scale: true,\n		coordinates: true\n	}\"\n	></div>",

	init: function(elt, broker) {

		const ctrl = $$.viewController(elt)

		broker.register('homebox.map.updateShape.*', (msg) => {

			const shapeId = msg.topic.split('.').pop()
			//console.log('shapeId', shapeId)

			const shape = msg.data

			if (shape == undefined) {
				ctrl.scope.map.removeShape(shapeId)
				return
			}

			try {
				ctrl.scope.map.updateShape(shapeId, shape)
			}
			catch(e) {
				ctrl.scope.map.addShape(shapeId, shape)
			}
		})

	}
});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90Lm1haW4nLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5icm9rZXInXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMubWFwXFxcIiBcXG5cdHN0eWxlPVxcXCJoZWlnaHQ6IDEwMCVcXFwiXFxuXHRibi1pZmFjZT1cXFwibWFwXFxcIlxcblx0Ym4tZGF0YT1cXFwie1xcblx0XHRjZW50ZXI6IHtsYXQ6IDQ4LjM5LCBsbmc6IC00LjQ4Nn0sXFxuXHRcdHNjYWxlOiB0cnVlLFxcblx0XHRjb29yZGluYXRlczogdHJ1ZVxcblx0fVxcXCJcXG5cdD48L2Rpdj5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIGJyb2tlcikge1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdClcblxuXHRcdGJyb2tlci5yZWdpc3RlcignaG9tZWJveC5tYXAudXBkYXRlU2hhcGUuKicsIChtc2cpID0+IHtcblxuXHRcdFx0Y29uc3Qgc2hhcGVJZCA9IG1zZy50b3BpYy5zcGxpdCgnLicpLnBvcCgpXG5cdFx0XHQvL2NvbnNvbGUubG9nKCdzaGFwZUlkJywgc2hhcGVJZClcblxuXHRcdFx0Y29uc3Qgc2hhcGUgPSBtc2cuZGF0YVxuXG5cdFx0XHRpZiAoc2hhcGUgPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdGN0cmwuc2NvcGUubWFwLnJlbW92ZVNoYXBlKHNoYXBlSWQpXG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXG5cdFx0XHR0cnkge1xuXHRcdFx0XHRjdHJsLnNjb3BlLm1hcC51cGRhdGVTaGFwZShzaGFwZUlkLCBzaGFwZSlcblx0XHRcdH1cblx0XHRcdGNhdGNoKGUpIHtcblx0XHRcdFx0Y3RybC5zY29wZS5tYXAuYWRkU2hhcGUoc2hhcGVJZCwgc2hhcGUpXG5cdFx0XHR9XG5cdFx0fSlcblxuXHR9XG59KTtcblxuXG5cblxuIl19
