$$.control.registerControl('rootPage', {

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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QuYnJva2VyJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLm1hcFxcXCIgXFxuXHRzdHlsZT1cXFwiaGVpZ2h0OiAxMDAlXFxcIlxcblx0Ym4taWZhY2U9XFxcIm1hcFxcXCJcXG5cdGJuLWRhdGE9XFxcIntcXG5cdFx0Y2VudGVyOiB7bGF0OiA0OC4zOSwgbG5nOiAtNC40ODZ9LFxcblx0XHRzY2FsZTogdHJ1ZSxcXG5cdFx0Y29vcmRpbmF0ZXM6IHRydWVcXG5cdH1cXFwiXFxuXHQ+PC9kaXY+XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBicm9rZXIpIHtcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQpXG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2hvbWVib3gubWFwLnVwZGF0ZVNoYXBlLionLCAobXNnKSA9PiB7XG5cblx0XHRcdGNvbnN0IHNoYXBlSWQgPSBtc2cudG9waWMuc3BsaXQoJy4nKS5wb3AoKVxuXHRcdFx0Ly9jb25zb2xlLmxvZygnc2hhcGVJZCcsIHNoYXBlSWQpXG5cblx0XHRcdGNvbnN0IHNoYXBlID0gbXNnLmRhdGFcblxuXHRcdFx0aWYgKHNoYXBlID09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRjdHJsLnNjb3BlLm1hcC5yZW1vdmVTaGFwZShzaGFwZUlkKVxuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0Y3RybC5zY29wZS5tYXAudXBkYXRlU2hhcGUoc2hhcGVJZCwgc2hhcGUpXG5cdFx0XHR9XG5cdFx0XHRjYXRjaChlKSB7XG5cdFx0XHRcdGN0cmwuc2NvcGUubWFwLmFkZFNoYXBlKHNoYXBlSWQsIHNoYXBlKVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0fVxufSk7XG5cblxuXG5cbiJdfQ==
