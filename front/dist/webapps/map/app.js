$$.control.registerControl('breizbot.main', {

	deps: ['breizbot.broker'],

	template: "<div bn-control=\"brainjs.map\" \n	style=\"height: 100%\"\n	bn-iface=\"map\"\n	bn-data=\"{\n		center: {lat: 48.39, lng: -4.486},\n		scale: true,\n		coordinates: true\n	}\"\n	></div>",

	init: function(elt, broker) {

		const ctrl = $$.viewController(elt)

		broker.register('homebox.map.updateShape', (msg) => {
			if (msg.hist === true) {
				return
			}
			//console.log('msg', msg)
			const {id, shape} = msg.data
			try {
				ctrl.scope.map.updateShape(id, shape)
			}
			catch(e) {
				ctrl.scope.map.addShape(id, shape)
			}
		})

		broker.register('homebox.map.removeShape', (msg) => {
			if (msg.hist === true) {
				return
			}
			//console.log('msg', msg)
			const {id} = msg.data
			ctrl.scope.map.removeShape(id)
		})

	}
});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90Lm1haW4nLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5icm9rZXInXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMubWFwXFxcIiBcXG5cdHN0eWxlPVxcXCJoZWlnaHQ6IDEwMCVcXFwiXFxuXHRibi1pZmFjZT1cXFwibWFwXFxcIlxcblx0Ym4tZGF0YT1cXFwie1xcblx0XHRjZW50ZXI6IHtsYXQ6IDQ4LjM5LCBsbmc6IC00LjQ4Nn0sXFxuXHRcdHNjYWxlOiB0cnVlLFxcblx0XHRjb29yZGluYXRlczogdHJ1ZVxcblx0fVxcXCJcXG5cdD48L2Rpdj5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIGJyb2tlcikge1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdClcblxuXHRcdGJyb2tlci5yZWdpc3RlcignaG9tZWJveC5tYXAudXBkYXRlU2hhcGUnLCAobXNnKSA9PiB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHRjb25zdCB7aWQsIHNoYXBlfSA9IG1zZy5kYXRhXG5cdFx0XHR0cnkge1xuXHRcdFx0XHRjdHJsLnNjb3BlLm1hcC51cGRhdGVTaGFwZShpZCwgc2hhcGUpXG5cdFx0XHR9XG5cdFx0XHRjYXRjaChlKSB7XG5cdFx0XHRcdGN0cmwuc2NvcGUubWFwLmFkZFNoYXBlKGlkLCBzaGFwZSlcblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0YnJva2VyLnJlZ2lzdGVyKCdob21lYm94Lm1hcC5yZW1vdmVTaGFwZScsIChtc2cpID0+IHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdC8vY29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdGNvbnN0IHtpZH0gPSBtc2cuZGF0YVxuXHRcdFx0Y3RybC5zY29wZS5tYXAucmVtb3ZlU2hhcGUoaWQpXG5cdFx0fSlcblxuXHR9XG59KTtcblxuXG5cblxuIl19
