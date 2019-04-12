$$.control.registerControl('$control.details', {

	template: "<h1 bn-text=\"name\" class=\"w3-blue w3-center\"></h1>\n\n<div bn-show=\"deps.length > 0\">\n	<h2>Dependancies</h2>\n	<ul bn-each=\"deps\">\n		<li bn-text=\"$i\"></li>\n	</ul>	\n</div>\n\n<div bn-show=\"hasProperties\">\n	<h2>Properties</h2>\n	<pre bn-text=\"props\"></pre>	\n</div>\n\n<div bn-show=\"hasEvents\">\n	<h2>Events</h2>\n	<ul bn-each=\"events\">\n		<li bn-text=\"$i\"></li>\n	</ul>	\n</div>\n\n<div bn-show=\"hasMethods\">\n	<h2>Methods</h2>\n	<ul bn-each=\"methods\">\n		<li bn-text=\"$i\"></li>\n	</ul>	\n</div>\n",

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
		{href: '/controls/:name', control: '$control.details'}

	]

	$$.viewController('#main', {
		data: {
			routes
		}
	})
});

$$.control.registerControl('$services', {

	template: "",

	init: function(elt) {

		const ctrl = $$.viewController(elt, {
			
			data: {
			}
		})		
	}

});



//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbnRyb2wuZGV0YWlscy5qcyIsImNvbnRyb2xzLmpzIiwibWFpbi5qcyIsInNlcnZpY2VzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImRvYy5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCckY29udHJvbC5kZXRhaWxzJywge1xuXG5cdHRlbXBsYXRlOiBcIjxoMSBibi10ZXh0PVxcXCJuYW1lXFxcIiBjbGFzcz1cXFwidzMtYmx1ZSB3My1jZW50ZXJcXFwiPjwvaDE+XFxuXFxuPGRpdiBibi1zaG93PVxcXCJkZXBzLmxlbmd0aCA+IDBcXFwiPlxcblx0PGgyPkRlcGVuZGFuY2llczwvaDI+XFxuXHQ8dWwgYm4tZWFjaD1cXFwiZGVwc1xcXCI+XFxuXHRcdDxsaSBibi10ZXh0PVxcXCIkaVxcXCI+PC9saT5cXG5cdDwvdWw+XHRcXG48L2Rpdj5cXG5cXG48ZGl2IGJuLXNob3c9XFxcImhhc1Byb3BlcnRpZXNcXFwiPlxcblx0PGgyPlByb3BlcnRpZXM8L2gyPlxcblx0PHByZSBibi10ZXh0PVxcXCJwcm9wc1xcXCI+PC9wcmU+XHRcXG48L2Rpdj5cXG5cXG48ZGl2IGJuLXNob3c9XFxcImhhc0V2ZW50c1xcXCI+XFxuXHQ8aDI+RXZlbnRzPC9oMj5cXG5cdDx1bCBibi1lYWNoPVxcXCJldmVudHNcXFwiPlxcblx0XHQ8bGkgYm4tdGV4dD1cXFwiJGlcXFwiPjwvbGk+XFxuXHQ8L3VsPlx0XFxuPC9kaXY+XFxuXFxuPGRpdiBibi1zaG93PVxcXCJoYXNNZXRob2RzXFxcIj5cXG5cdDxoMj5NZXRob2RzPC9oMj5cXG5cdDx1bCBibi1lYWNoPVxcXCJtZXRob2RzXFxcIj5cXG5cdFx0PGxpIGJuLXRleHQ9XFxcIiRpXFxcIj48L2xpPlxcblx0PC91bD5cdFxcbjwvZGl2PlxcblwiLFxuXG5cdHByb3BzOiB7XG5cdFx0bmFtZTogJydcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQpIHtcblxuXHRcdGNvbnN0IGluZm8gPSAkJC5jb250cm9sLmdldENvbnRyb2xJbmZvKHRoaXMucHJvcHMubmFtZSlcblx0XHRjb25zb2xlLmxvZygnaW5mbycsIGluZm8pXG5cblxuXHRcdGxldCBoYXNNZXRob2RzID0gZmFsc2Vcblx0XHRsZXQgaGFzRXZlbnRzID0gZmFsc2VcblxuXHRcdGxldCBtZXRob2RzID0gIFtdXG5cdFx0aWYgKHR5cGVvZiBpbmZvLm9wdGlvbnMuJGlmYWNlID09ICdzdHJpbmcnKSB7XG5cdFx0XHRtZXRob2RzID0gaW5mby5vcHRpb25zLiRpZmFjZS5zcGxpdCgnOycpXG5cdFx0XHRoYXNNZXRob2RzID0gdHJ1ZVxuXHRcdH1cblxuXHRcdGxldCBldmVudHMgPSAgW11cblx0XHRpZiAodHlwZW9mIGluZm8ub3B0aW9ucy4kZXZlbnRzID09ICdzdHJpbmcnKSB7XG5cdFx0XHRldmVudHMgPSBpbmZvLm9wdGlvbnMuJGV2ZW50cy5zcGxpdCgnOycpXG5cdFx0XHRoYXNFdmVudHMgPSB0cnVlXG5cdFx0fVxuXG5cdFx0Y29uc3QgcHJvcHMgPSBpbmZvLm9wdGlvbnMucHJvcHMgfHwge31cblx0XHRcblx0XHRjb25zdCBoYXNQcm9wZXJ0aWVzID0gT2JqZWN0LmtleXMocHJvcHMpLmxlbmd0aCAhPSAwXG5cdFx0Y29uc29sZS5sb2coJ2hhc01ldGhvZHMnLCBoYXNNZXRob2RzLCBtZXRob2RzKVxuXHRcdGNvbnNvbGUubG9nKCdoYXNFdmVudHMnLCBoYXNFdmVudHMsIGV2ZW50cylcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRkZXBzOiBpbmZvLmRlcHMsXG5cdFx0XHRcdGhhc0V2ZW50cyxcblx0XHRcdFx0aGFzTWV0aG9kcyxcblx0XHRcdFx0aGFzUHJvcGVydGllcyxcblx0XHRcdFx0bmFtZTogdGhpcy5wcm9wcy5uYW1lLFxuXHRcdFx0XHRtZXRob2RzLFxuXHRcdFx0XHRldmVudHMsXG5cdFx0XHRcdHByb3BzOiBKU09OLnN0cmluZ2lmeShwcm9wcywgbnVsbCwgNCkvLy5yZXBsYWNlKC9cXFwiL2csICcnKVxuXHRcdFx0fVxuXHRcdH0pXHRcblxuXHR9XG5cbn0pO1xuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCckY29udHJvbHMnLCB7XG5cblx0dGVtcGxhdGU6IFwiPHVsIGJuLWVhY2g9XFxcImN0cmxzXFxcIj5cXG5cdDxsaT48YSBibi1hdHRyPVxcXCJ7aHJlZjogJGkudXJsfVxcXCIgYm4tdGV4dD1cXFwiJGkubmFtZVxcXCI+PC9hPjwvbGk+XFxuPC91bD5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQpIHtcblxuXHRcdGNvbnN0IGN0cmxzID0gJCQuY29udHJvbC5nZXRDb250cm9scygpLmZpbHRlcigobmFtZSkgPT4gbmFtZS5zdGFydHNXaXRoKCdicmVpemJvdC4nKSkubWFwKChuYW1lKSA9PiB7XG5cdFx0XHRyZXR1cm4ge25hbWUsIHVybDogJyMvY29udHJvbHMvJyArIG5hbWV9XG5cdFx0fSlcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRjdHJsc1xuXHRcdFx0fVxuXHRcdH0pXHRcdFxuXHR9XG5cbn0pO1xuXG5cbiIsIlxuJChmdW5jdGlvbigpIHtcblxuXHRsZXQgcm91dGVzID0gW1xuXHRcdHtocmVmOiAnLycsIHJlZGlyZWN0OiAnL2NvbnRyb2xzJ30sXG5cdFx0e2hyZWY6ICcvY29udHJvbHMnLCBjb250cm9sOiAnJGNvbnRyb2xzJ30sXG5cdFx0e2hyZWY6ICcvc2VydmljZXMnLCBjb250cm9sOiAnJHNlcnZpY2VzJ30sXG5cdFx0e2hyZWY6ICcvY29udHJvbHMvOm5hbWUnLCBjb250cm9sOiAnJGNvbnRyb2wuZGV0YWlscyd9XG5cblx0XVxuXG5cdCQkLnZpZXdDb250cm9sbGVyKCcjbWFpbicsIHtcblx0XHRkYXRhOiB7XG5cdFx0XHRyb3V0ZXNcblx0XHR9XG5cdH0pXG59KTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCckc2VydmljZXMnLCB7XG5cblx0dGVtcGxhdGU6IFwiXCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0KSB7XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRcblx0XHRcdGRhdGE6IHtcblx0XHRcdH1cblx0XHR9KVx0XHRcblx0fVxuXG59KTtcblxuXG4iXX0=
