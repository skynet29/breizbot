$$.control.registerControl('$control.details', {

	template: "<h1 class=\"w3-blue w3-center\">Control&nbsp;<span bn-text=\"name\"></span></h1>\n\n<div bn-show=\"deps.length > 0\">\n	<h2>Dependancies</h2>\n	<ul bn-each=\"deps\">\n		<li bn-text=\"$i\"></li>\n	</ul>	\n</div>\n\n<div bn-show=\"hasProperties\">\n	<h2>Properties</h2>\n	<pre bn-text=\"props\"></pre>	\n</div>\n\n<div bn-show=\"hasEvents\">\n	<h2>Events</h2>\n	<ul bn-each=\"events\">\n		<li bn-text=\"$i\"></li>\n	</ul>	\n</div>\n\n<div bn-show=\"hasMethods\">\n	<h2>Methods</h2>\n	<ul bn-each=\"methods\">\n		<li bn-text=\"$i\"></li>\n	</ul>	\n</div>\n",

	props: {
		name: ''
	},

	init: function(elt) {

		const info = $$.control.getControlInfo(this.props.name)
		console.log('info', info)


		let hasMethods = false
		let hasEvents = false

		let methods =  []
		if (typeof info.options.$iface == 'string') {
			methods = info.options.$iface.split(';')
			hasMethods = true
		}

		let events =  []
		if (typeof info.options.$events == 'string') {
			events = info.options.$events.split(';')
			hasEvents = true
		}

		const props = info.options.props || {}
		
		const hasProperties = Object.keys(props).length != 0
		console.log('hasMethods', hasMethods, methods)
		console.log('hasEvents', hasEvents, events)

		const ctrl = $$.viewController(elt, {
			
			data: {
				deps: info.deps,
				hasEvents,
				hasMethods,
				hasProperties,
				name: this.props.name,
				methods,
				events,
				props: JSON.stringify(props, null, 4)//.replace(/\"/g, '')
			}
		})	

	}

});



$$.control.registerControl('$controls', {

	template: "<ul bn-each=\"ctrls\">\n	<li><a bn-attr=\"{href: $i.url}\" bn-text=\"$i.name\"></a></li>\n</ul>",

	init: function(elt) {

		const ctrls = $$.control.getControls().filter((name) => name.startsWith('breizbot.')).map((name) => {
			return {name, url: '#/controls/' + name}
		})

		const ctrl = $$.viewController(elt, {
			
			data: {
				ctrls
			}
		})		
	}

});




$(function() {

	let routes = [
		{href: '/', redirect: '/controls'},
		{href: '/controls', control: '$controls'},
		{href: '/services', control: '$services'},
		{href: '/controls/:name', control: '$control.details'},
		{href: '/services/:name', control: '$service.details'}

	]

	$$.viewController('#main', {
		data: {
			routes
		}
	})
});

$$.control.registerControl('$service.details', {

	template: "<h1 class=\"w3-blue w3-center\">Service&nbsp;<span bn-text=\"name\"></span></h1>\n\n<div bn-show=\"deps.length > 0\">\n	<h2>Dependancies</h2>\n	<ul bn-each=\"deps\">\n		<li bn-text=\"$i\"></li>\n	</ul>	\n</div>\n\n<div bn-show=\"hasMethods\">\n	<h2>Methods</h2>\n	<ul bn-each=\"methods\">\n		<li bn-text=\"$i\"></li>\n	</ul>	\n</div>\n",

	props: {
		name: ''
	},

	init: function(elt) {

		const info = $$.service.getServiceInfo(this.props.name)
		console.log('info', info)


		let hasMethods = false

		let methods =  []
		if (typeof info.options.$iface == 'string') {
			methods = info.options.$iface.split(';')
			hasMethods = true
		}


		const ctrl = $$.viewController(elt, {
			
			data: {
				deps: info.deps,				
				hasMethods,
				name: this.props.name,
				methods,
			}
		})	

	}

});



$$.control.registerControl('$services', {

	template: "<ul bn-each=\"services\">\n	<li><a bn-attr=\"{href: $i.url}\" bn-text=\"$i.name\"></a></li>\n</ul>",

	init: function(elt) {

		const services = $$.service.getServices().filter((name) => name.startsWith('breizbot.')).map((name) => {
			return {name, url: '#/services/' + name}
		})
	

		const ctrl = $$.viewController(elt, {
			
			data: {
				services
			}
		})		
	}

});



//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbnRyb2wuZGV0YWlscy5qcyIsImNvbnRyb2xzLmpzIiwibWFpbi5qcyIsInNlcnZpY2UuZGV0YWlscy5qcyIsInNlcnZpY2VzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImRvYy5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCckY29udHJvbC5kZXRhaWxzJywge1xuXG5cdHRlbXBsYXRlOiBcIjxoMSBjbGFzcz1cXFwidzMtYmx1ZSB3My1jZW50ZXJcXFwiPkNvbnRyb2wmbmJzcDs8c3BhbiBibi10ZXh0PVxcXCJuYW1lXFxcIj48L3NwYW4+PC9oMT5cXG5cXG48ZGl2IGJuLXNob3c9XFxcImRlcHMubGVuZ3RoID4gMFxcXCI+XFxuXHQ8aDI+RGVwZW5kYW5jaWVzPC9oMj5cXG5cdDx1bCBibi1lYWNoPVxcXCJkZXBzXFxcIj5cXG5cdFx0PGxpIGJuLXRleHQ9XFxcIiRpXFxcIj48L2xpPlxcblx0PC91bD5cdFxcbjwvZGl2PlxcblxcbjxkaXYgYm4tc2hvdz1cXFwiaGFzUHJvcGVydGllc1xcXCI+XFxuXHQ8aDI+UHJvcGVydGllczwvaDI+XFxuXHQ8cHJlIGJuLXRleHQ9XFxcInByb3BzXFxcIj48L3ByZT5cdFxcbjwvZGl2PlxcblxcbjxkaXYgYm4tc2hvdz1cXFwiaGFzRXZlbnRzXFxcIj5cXG5cdDxoMj5FdmVudHM8L2gyPlxcblx0PHVsIGJuLWVhY2g9XFxcImV2ZW50c1xcXCI+XFxuXHRcdDxsaSBibi10ZXh0PVxcXCIkaVxcXCI+PC9saT5cXG5cdDwvdWw+XHRcXG48L2Rpdj5cXG5cXG48ZGl2IGJuLXNob3c9XFxcImhhc01ldGhvZHNcXFwiPlxcblx0PGgyPk1ldGhvZHM8L2gyPlxcblx0PHVsIGJuLWVhY2g9XFxcIm1ldGhvZHNcXFwiPlxcblx0XHQ8bGkgYm4tdGV4dD1cXFwiJGlcXFwiPjwvbGk+XFxuXHQ8L3VsPlx0XFxuPC9kaXY+XFxuXCIsXG5cblx0cHJvcHM6IHtcblx0XHRuYW1lOiAnJ1xuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXG5cdFx0Y29uc3QgaW5mbyA9ICQkLmNvbnRyb2wuZ2V0Q29udHJvbEluZm8odGhpcy5wcm9wcy5uYW1lKVxuXHRcdGNvbnNvbGUubG9nKCdpbmZvJywgaW5mbylcblxuXG5cdFx0bGV0IGhhc01ldGhvZHMgPSBmYWxzZVxuXHRcdGxldCBoYXNFdmVudHMgPSBmYWxzZVxuXG5cdFx0bGV0IG1ldGhvZHMgPSAgW11cblx0XHRpZiAodHlwZW9mIGluZm8ub3B0aW9ucy4kaWZhY2UgPT0gJ3N0cmluZycpIHtcblx0XHRcdG1ldGhvZHMgPSBpbmZvLm9wdGlvbnMuJGlmYWNlLnNwbGl0KCc7Jylcblx0XHRcdGhhc01ldGhvZHMgPSB0cnVlXG5cdFx0fVxuXG5cdFx0bGV0IGV2ZW50cyA9ICBbXVxuXHRcdGlmICh0eXBlb2YgaW5mby5vcHRpb25zLiRldmVudHMgPT0gJ3N0cmluZycpIHtcblx0XHRcdGV2ZW50cyA9IGluZm8ub3B0aW9ucy4kZXZlbnRzLnNwbGl0KCc7Jylcblx0XHRcdGhhc0V2ZW50cyA9IHRydWVcblx0XHR9XG5cblx0XHRjb25zdCBwcm9wcyA9IGluZm8ub3B0aW9ucy5wcm9wcyB8fCB7fVxuXHRcdFxuXHRcdGNvbnN0IGhhc1Byb3BlcnRpZXMgPSBPYmplY3Qua2V5cyhwcm9wcykubGVuZ3RoICE9IDBcblx0XHRjb25zb2xlLmxvZygnaGFzTWV0aG9kcycsIGhhc01ldGhvZHMsIG1ldGhvZHMpXG5cdFx0Y29uc29sZS5sb2coJ2hhc0V2ZW50cycsIGhhc0V2ZW50cywgZXZlbnRzKVxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGRlcHM6IGluZm8uZGVwcyxcblx0XHRcdFx0aGFzRXZlbnRzLFxuXHRcdFx0XHRoYXNNZXRob2RzLFxuXHRcdFx0XHRoYXNQcm9wZXJ0aWVzLFxuXHRcdFx0XHRuYW1lOiB0aGlzLnByb3BzLm5hbWUsXG5cdFx0XHRcdG1ldGhvZHMsXG5cdFx0XHRcdGV2ZW50cyxcblx0XHRcdFx0cHJvcHM6IEpTT04uc3RyaW5naWZ5KHByb3BzLCBudWxsLCA0KS8vLnJlcGxhY2UoL1xcXCIvZywgJycpXG5cdFx0XHR9XG5cdFx0fSlcdFxuXG5cdH1cblxufSk7XG5cblxuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJyRjb250cm9scycsIHtcblxuXHR0ZW1wbGF0ZTogXCI8dWwgYm4tZWFjaD1cXFwiY3RybHNcXFwiPlxcblx0PGxpPjxhIGJuLWF0dHI9XFxcIntocmVmOiAkaS51cmx9XFxcIiBibi10ZXh0PVxcXCIkaS5uYW1lXFxcIj48L2E+PC9saT5cXG48L3VsPlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXG5cdFx0Y29uc3QgY3RybHMgPSAkJC5jb250cm9sLmdldENvbnRyb2xzKCkuZmlsdGVyKChuYW1lKSA9PiBuYW1lLnN0YXJ0c1dpdGgoJ2JyZWl6Ym90LicpKS5tYXAoKG5hbWUpID0+IHtcblx0XHRcdHJldHVybiB7bmFtZSwgdXJsOiAnIy9jb250cm9scy8nICsgbmFtZX1cblx0XHR9KVxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGN0cmxzXG5cdFx0XHR9XG5cdFx0fSlcdFx0XG5cdH1cblxufSk7XG5cblxuIiwiXG4kKGZ1bmN0aW9uKCkge1xuXG5cdGxldCByb3V0ZXMgPSBbXG5cdFx0e2hyZWY6ICcvJywgcmVkaXJlY3Q6ICcvY29udHJvbHMnfSxcblx0XHR7aHJlZjogJy9jb250cm9scycsIGNvbnRyb2w6ICckY29udHJvbHMnfSxcblx0XHR7aHJlZjogJy9zZXJ2aWNlcycsIGNvbnRyb2w6ICckc2VydmljZXMnfSxcblx0XHR7aHJlZjogJy9jb250cm9scy86bmFtZScsIGNvbnRyb2w6ICckY29udHJvbC5kZXRhaWxzJ30sXG5cdFx0e2hyZWY6ICcvc2VydmljZXMvOm5hbWUnLCBjb250cm9sOiAnJHNlcnZpY2UuZGV0YWlscyd9XG5cblx0XVxuXG5cdCQkLnZpZXdDb250cm9sbGVyKCcjbWFpbicsIHtcblx0XHRkYXRhOiB7XG5cdFx0XHRyb3V0ZXNcblx0XHR9XG5cdH0pXG59KTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCckc2VydmljZS5kZXRhaWxzJywge1xuXG5cdHRlbXBsYXRlOiBcIjxoMSBjbGFzcz1cXFwidzMtYmx1ZSB3My1jZW50ZXJcXFwiPlNlcnZpY2UmbmJzcDs8c3BhbiBibi10ZXh0PVxcXCJuYW1lXFxcIj48L3NwYW4+PC9oMT5cXG5cXG48ZGl2IGJuLXNob3c9XFxcImRlcHMubGVuZ3RoID4gMFxcXCI+XFxuXHQ8aDI+RGVwZW5kYW5jaWVzPC9oMj5cXG5cdDx1bCBibi1lYWNoPVxcXCJkZXBzXFxcIj5cXG5cdFx0PGxpIGJuLXRleHQ9XFxcIiRpXFxcIj48L2xpPlxcblx0PC91bD5cdFxcbjwvZGl2PlxcblxcbjxkaXYgYm4tc2hvdz1cXFwiaGFzTWV0aG9kc1xcXCI+XFxuXHQ8aDI+TWV0aG9kczwvaDI+XFxuXHQ8dWwgYm4tZWFjaD1cXFwibWV0aG9kc1xcXCI+XFxuXHRcdDxsaSBibi10ZXh0PVxcXCIkaVxcXCI+PC9saT5cXG5cdDwvdWw+XHRcXG48L2Rpdj5cXG5cIixcblxuXHRwcm9wczoge1xuXHRcdG5hbWU6ICcnXG5cdH0sXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0KSB7XG5cblx0XHRjb25zdCBpbmZvID0gJCQuc2VydmljZS5nZXRTZXJ2aWNlSW5mbyh0aGlzLnByb3BzLm5hbWUpXG5cdFx0Y29uc29sZS5sb2coJ2luZm8nLCBpbmZvKVxuXG5cblx0XHRsZXQgaGFzTWV0aG9kcyA9IGZhbHNlXG5cblx0XHRsZXQgbWV0aG9kcyA9ICBbXVxuXHRcdGlmICh0eXBlb2YgaW5mby5vcHRpb25zLiRpZmFjZSA9PSAnc3RyaW5nJykge1xuXHRcdFx0bWV0aG9kcyA9IGluZm8ub3B0aW9ucy4kaWZhY2Uuc3BsaXQoJzsnKVxuXHRcdFx0aGFzTWV0aG9kcyA9IHRydWVcblx0XHR9XG5cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRkZXBzOiBpbmZvLmRlcHMsXHRcdFx0XHRcblx0XHRcdFx0aGFzTWV0aG9kcyxcblx0XHRcdFx0bmFtZTogdGhpcy5wcm9wcy5uYW1lLFxuXHRcdFx0XHRtZXRob2RzLFxuXHRcdFx0fVxuXHRcdH0pXHRcblxuXHR9XG5cbn0pO1xuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCckc2VydmljZXMnLCB7XG5cblx0dGVtcGxhdGU6IFwiPHVsIGJuLWVhY2g9XFxcInNlcnZpY2VzXFxcIj5cXG5cdDxsaT48YSBibi1hdHRyPVxcXCJ7aHJlZjogJGkudXJsfVxcXCIgYm4tdGV4dD1cXFwiJGkubmFtZVxcXCI+PC9hPjwvbGk+XFxuPC91bD5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQpIHtcblxuXHRcdGNvbnN0IHNlcnZpY2VzID0gJCQuc2VydmljZS5nZXRTZXJ2aWNlcygpLmZpbHRlcigobmFtZSkgPT4gbmFtZS5zdGFydHNXaXRoKCdicmVpemJvdC4nKSkubWFwKChuYW1lKSA9PiB7XG5cdFx0XHRyZXR1cm4ge25hbWUsIHVybDogJyMvc2VydmljZXMvJyArIG5hbWV9XG5cdFx0fSlcblx0XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0c2VydmljZXNcblx0XHRcdH1cblx0XHR9KVx0XHRcblx0fVxuXG59KTtcblxuXG4iXX0=
