$$.control.registerControl('rootPage', {

	template: "\n\n<form bn-event=\"submit: onStart\" bn-bind=\"form\">\n	<input type=\"text\" name=\"url\" placeholder=\"Search or paste video link url here\" required=\"\" bn-event=\"click: onInputClick\" autocomplete=\"on\">\n	<button class=\"w3-button w3-blue\" type=\"submit\"><i class=\"fa fa-search\"></i></button>\n</form>\n\n<div bn-show=\"show1\" bn-control=\"brainjs.progressbar\" bn-val=\"percent\" bn-data=\"{showPercent: true}\">\n</div>\n\n<div bn-show=\"show2\">\n	<button class=\"w3-button w3-blue\" title=\"Back to list\" bn-event=\"click: onBackToList\">\n		<i class=\"fa fa-chevron-left\"></i>\n	</button>\n</div>	\n\n<div class=\"info\" bn-show=\"show3\">\n	<div class=\"thumbnail\">\n		<img bn-attr=\"{src: thumbnail_url}\">\n		<div class=\"download\" bn-show=\"show4\">\n			<div>\n				<button \n					class=\"w3-button w3-green\" \n					title=\"Download\"\n					bn-event=\"click: onDownload\"\n					><i class=\"fa fa-download\"></i></button>\n				\n			</div>\n			<div>\n				<a class=\"w3-button w3-red\" title=\"Play on Youtube\" bn-attr=\"{href: videoUrl}\" target=\"_blank\">\n					<i class=\"fa fa-play-circle\"></i>\n				</a>\n				\n			</div>\n			\n		</div>\n	</div>\n	<div class=\"details\">\n		<div>\n			<strong>Title: </strong> <span bn-text=\"title\"></span>				\n		</div>\n		<div>\n			<strong>Length: </strong><span bn-text=\"text1\"></span>	\n		</div>\n		<div class=\"description\">\n			<strong>Description: </strong><textarea bn-text=\"description\"></textarea>	\n		</div>		\n		\n	</div>	\n\n\n\n</div>\n	\n\n<div class=\"results w3-light-grey\" bn-show=\"!showInfo\">\n	<div bn-each=\"results\" bn-event=\"click.item: onItemInfo\">\n		<div class=\"item w3-card-2 w3-hover-shadow\">\n			<img bn-attr=\"{src: $scope.$i.thumbnail}\">\n			<strong bn-text=\"$scope.$i.title\"></strong>\n		</div>\n	</div>\n</div>",

	deps: ['app.ytdl', 'breizbot.broker', 'breizbot.params'],

	init: function(elt ,ytdl, broker, params) {

		const ctrl = $$.viewController(elt, {
			data: {
				title: '',
				length_seconds: 0,
				thumbnail_url: '#', 
				description: '',
				percent: 0,
				results: [],
				showInfo: true,
				videoUrl: '',
				show1: function() {return this.showInfo && this.percent != 0},
				show2: function() {return this.showInfo && this.results.length > 0},
				show3: function() {return this.showInfo && this.title != ''},
				show4: function() {return this.percent == 0},
				text1: function() {
					return new Date(this.length_seconds*1000).toLocaleTimeString('fr-FR', {timeZone: 'UTC'})
				}
			},
			events: {
				onStart: function(ev) {
					ev.preventDefault()
					const {url} = $(this).getFormData()
					if (url.startsWith('https://youtu.be/')) {
						showInfo(url)	
					}
					else {
						searchInfo(url)
					}
				},
				onDownload: function(ev) {
					const {videoUrl, title} = ctrl.model
					console.log('onDownload', videoUrl)
					const fileName = title + '.mp4'
					ytdl.download(videoUrl, fileName)
				},

				onItemInfo: function(ev) {
					const idx = $(this).index()
					const videoId = ctrl.model.results[idx].id
					console.log('onItemInfo', videoId)
					showInfo('https://youtu.be/' + videoId)
				},
				onInputClick: function() {
					$(this).val('')
				},

				onBackToList: function() {
					ctrl.setData({showInfo: false})
				}
			}
		})

		function showInfo(url) {
			//console.log('showInfo', url)
			ytdl.info(url).then((info) => {
				//console.log('info', info)
				info.percent = 0
				info.showInfo = true,
				info.videoUrl = url
				ctrl.setData(info)
			})
		}

		function searchInfo(query) {
			//console.log('searchInfo', query)
			ytdl.search(query, 10).then((results) => {
				//console.log('results', results)
				ctrl.setData({results, showInfo: false})
			})
		}

		broker.onTopic('breizbot.ytdl.progress', (msg) => {
			if (msg.hist == true) {
				return
			}
			//console.log('progress', msg.data)
			const {percent} = msg.data
			ctrl.setData({percent})
		})

		if (params.url != undefined) {
			ctrl.scope.form.setFormData({url: params.url})
			showInfo(params.url)
		}

	}


});





$$.service.registerService('app.ytdl', {

	deps: ['breizbot.http', 'breizbot.broker'],

	init: function(config, http, broker) {

		let srcId

		broker.on('ready', (msg) => { srcId = msg.clientId})

		return {
			info: function(url) {
				return http.get(`/info`, {url})
			},

			download: function(url, fileName) {
				return http.post(`/download`, {url, fileName, srcId})
			},

			search: function(query, maxResults = 3)	{
				return http.post(`/search`, {query, maxResults})
			}		
		}
	}

});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJzZXJ2aWNlcy95dGRsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIlxcblxcbjxmb3JtIGJuLWV2ZW50PVxcXCJzdWJtaXQ6IG9uU3RhcnRcXFwiIGJuLWJpbmQ9XFxcImZvcm1cXFwiPlxcblx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcInVybFxcXCIgcGxhY2Vob2xkZXI9XFxcIlNlYXJjaCBvciBwYXN0ZSB2aWRlbyBsaW5rIHVybCBoZXJlXFxcIiByZXF1aXJlZD1cXFwiXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uSW5wdXRDbGlja1xcXCIgYXV0b2NvbXBsZXRlPVxcXCJvblxcXCI+XFxuXHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtYmx1ZVxcXCIgdHlwZT1cXFwic3VibWl0XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtc2VhcmNoXFxcIj48L2k+PC9idXR0b24+XFxuPC9mb3JtPlxcblxcbjxkaXYgYm4tc2hvdz1cXFwic2hvdzFcXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMucHJvZ3Jlc3NiYXJcXFwiIGJuLXZhbD1cXFwicGVyY2VudFxcXCIgYm4tZGF0YT1cXFwie3Nob3dQZXJjZW50OiB0cnVlfVxcXCI+XFxuPC9kaXY+XFxuXFxuPGRpdiBibi1zaG93PVxcXCJzaG93MlxcXCI+XFxuXHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtYmx1ZVxcXCIgdGl0bGU9XFxcIkJhY2sgdG8gbGlzdFxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkJhY2tUb0xpc3RcXFwiPlxcblx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtY2hldnJvbi1sZWZ0XFxcIj48L2k+XFxuXHQ8L2J1dHRvbj5cXG48L2Rpdj5cdFxcblxcbjxkaXYgY2xhc3M9XFxcImluZm9cXFwiIGJuLXNob3c9XFxcInNob3czXFxcIj5cXG5cdDxkaXYgY2xhc3M9XFxcInRodW1ibmFpbFxcXCI+XFxuXHRcdDxpbWcgYm4tYXR0cj1cXFwie3NyYzogdGh1bWJuYWlsX3VybH1cXFwiPlxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJkb3dubG9hZFxcXCIgYm4tc2hvdz1cXFwic2hvdzRcXFwiPlxcblx0XHRcdDxkaXY+XFxuXHRcdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uIHczLWdyZWVuXFxcIiBcXG5cdFx0XHRcdFx0dGl0bGU9XFxcIkRvd25sb2FkXFxcIlxcblx0XHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uRG93bmxvYWRcXFwiXFxuXHRcdFx0XHRcdD48aSBjbGFzcz1cXFwiZmEgZmEtZG93bmxvYWRcXFwiPjwvaT48L2J1dHRvbj5cXG5cdFx0XHRcdFxcblx0XHRcdDwvZGl2Plxcblx0XHRcdDxkaXY+XFxuXHRcdFx0XHQ8YSBjbGFzcz1cXFwidzMtYnV0dG9uIHczLXJlZFxcXCIgdGl0bGU9XFxcIlBsYXkgb24gWW91dHViZVxcXCIgYm4tYXR0cj1cXFwie2hyZWY6IHZpZGVvVXJsfVxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPlxcblx0XHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtcGxheS1jaXJjbGVcXFwiPjwvaT5cXG5cdFx0XHRcdDwvYT5cXG5cdFx0XHRcdFxcblx0XHRcdDwvZGl2Plxcblx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2Plxcblx0PGRpdiBjbGFzcz1cXFwiZGV0YWlsc1xcXCI+XFxuXHRcdDxkaXY+XFxuXHRcdFx0PHN0cm9uZz5UaXRsZTogPC9zdHJvbmc+IDxzcGFuIGJuLXRleHQ9XFxcInRpdGxlXFxcIj48L3NwYW4+XHRcdFx0XHRcXG5cdFx0PC9kaXY+XFxuXHRcdDxkaXY+XFxuXHRcdFx0PHN0cm9uZz5MZW5ndGg6IDwvc3Ryb25nPjxzcGFuIGJuLXRleHQ9XFxcInRleHQxXFxcIj48L3NwYW4+XHRcXG5cdFx0PC9kaXY+XFxuXHRcdDxkaXYgY2xhc3M9XFxcImRlc2NyaXB0aW9uXFxcIj5cXG5cdFx0XHQ8c3Ryb25nPkRlc2NyaXB0aW9uOiA8L3N0cm9uZz48dGV4dGFyZWEgYm4tdGV4dD1cXFwiZGVzY3JpcHRpb25cXFwiPjwvdGV4dGFyZWE+XHRcXG5cdFx0PC9kaXY+XHRcdFxcblx0XHRcXG5cdDwvZGl2Plx0XFxuXFxuXFxuXFxuPC9kaXY+XFxuXHRcXG5cXG48ZGl2IGNsYXNzPVxcXCJyZXN1bHRzIHczLWxpZ2h0LWdyZXlcXFwiIGJuLXNob3c9XFxcIiFzaG93SW5mb1xcXCI+XFxuXHQ8ZGl2IGJuLWVhY2g9XFxcInJlc3VsdHNcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5pdGVtOiBvbkl0ZW1JbmZvXFxcIj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwiaXRlbSB3My1jYXJkLTIgdzMtaG92ZXItc2hhZG93XFxcIj5cXG5cdFx0XHQ8aW1nIGJuLWF0dHI9XFxcIntzcmM6ICRzY29wZS4kaS50aHVtYm5haWx9XFxcIj5cXG5cdFx0XHQ8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS4kaS50aXRsZVxcXCI+PC9zdHJvbmc+XFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuPC9kaXY+XCIsXG5cblx0ZGVwczogWydhcHAueXRkbCcsICdicmVpemJvdC5icm9rZXInLCAnYnJlaXpib3QucGFyYW1zJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0ICx5dGRsLCBicm9rZXIsIHBhcmFtcykge1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHR0aXRsZTogJycsXG5cdFx0XHRcdGxlbmd0aF9zZWNvbmRzOiAwLFxuXHRcdFx0XHR0aHVtYm5haWxfdXJsOiAnIycsIFxuXHRcdFx0XHRkZXNjcmlwdGlvbjogJycsXG5cdFx0XHRcdHBlcmNlbnQ6IDAsXG5cdFx0XHRcdHJlc3VsdHM6IFtdLFxuXHRcdFx0XHRzaG93SW5mbzogdHJ1ZSxcblx0XHRcdFx0dmlkZW9Vcmw6ICcnLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7cmV0dXJuIHRoaXMuc2hvd0luZm8gJiYgdGhpcy5wZXJjZW50ICE9IDB9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24oKSB7cmV0dXJuIHRoaXMuc2hvd0luZm8gJiYgdGhpcy5yZXN1bHRzLmxlbmd0aCA+IDB9LFxuXHRcdFx0XHRzaG93MzogZnVuY3Rpb24oKSB7cmV0dXJuIHRoaXMuc2hvd0luZm8gJiYgdGhpcy50aXRsZSAhPSAnJ30sXG5cdFx0XHRcdHNob3c0OiBmdW5jdGlvbigpIHtyZXR1cm4gdGhpcy5wZXJjZW50ID09IDB9LFxuXHRcdFx0XHR0ZXh0MTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBEYXRlKHRoaXMubGVuZ3RoX3NlY29uZHMqMTAwMCkudG9Mb2NhbGVUaW1lU3RyaW5nKCdmci1GUicsIHt0aW1lWm9uZTogJ1VUQyd9KVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uU3RhcnQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdGNvbnN0IHt1cmx9ID0gJCh0aGlzKS5nZXRGb3JtRGF0YSgpXG5cdFx0XHRcdFx0aWYgKHVybC5zdGFydHNXaXRoKCdodHRwczovL3lvdXR1LmJlLycpKSB7XG5cdFx0XHRcdFx0XHRzaG93SW5mbyh1cmwpXHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRzZWFyY2hJbmZvKHVybClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uRG93bmxvYWQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3Qge3ZpZGVvVXJsLCB0aXRsZX0gPSBjdHJsLm1vZGVsXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uRG93bmxvYWQnLCB2aWRlb1VybClcblx0XHRcdFx0XHRjb25zdCBmaWxlTmFtZSA9IHRpdGxlICsgJy5tcDQnXG5cdFx0XHRcdFx0eXRkbC5kb3dubG9hZCh2aWRlb1VybCwgZmlsZU5hbWUpXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25JdGVtSW5mbzogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCB2aWRlb0lkID0gY3RybC5tb2RlbC5yZXN1bHRzW2lkeF0uaWRcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25JdGVtSW5mbycsIHZpZGVvSWQpXG5cdFx0XHRcdFx0c2hvd0luZm8oJ2h0dHBzOi8veW91dHUuYmUvJyArIHZpZGVvSWQpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSW5wdXRDbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0JCh0aGlzKS52YWwoJycpXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25CYWNrVG9MaXN0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3Nob3dJbmZvOiBmYWxzZX0pXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0ZnVuY3Rpb24gc2hvd0luZm8odXJsKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdzaG93SW5mbycsIHVybClcblx0XHRcdHl0ZGwuaW5mbyh1cmwpLnRoZW4oKGluZm8pID0+IHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnaW5mbycsIGluZm8pXG5cdFx0XHRcdGluZm8ucGVyY2VudCA9IDBcblx0XHRcdFx0aW5mby5zaG93SW5mbyA9IHRydWUsXG5cdFx0XHRcdGluZm8udmlkZW9VcmwgPSB1cmxcblx0XHRcdFx0Y3RybC5zZXREYXRhKGluZm8pXG5cdFx0XHR9KVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNlYXJjaEluZm8ocXVlcnkpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ3NlYXJjaEluZm8nLCBxdWVyeSlcblx0XHRcdHl0ZGwuc2VhcmNoKHF1ZXJ5LCAxMCkudGhlbigocmVzdWx0cykgPT4ge1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdyZXN1bHRzJywgcmVzdWx0cylcblx0XHRcdFx0Y3RybC5zZXREYXRhKHtyZXN1bHRzLCBzaG93SW5mbzogZmFsc2V9KVxuXHRcdFx0fSlcblx0XHR9XG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QueXRkbC5wcm9ncmVzcycsIChtc2cpID0+IHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Ly9jb25zb2xlLmxvZygncHJvZ3Jlc3MnLCBtc2cuZGF0YSlcblx0XHRcdGNvbnN0IHtwZXJjZW50fSA9IG1zZy5kYXRhXG5cdFx0XHRjdHJsLnNldERhdGEoe3BlcmNlbnR9KVxuXHRcdH0pXG5cblx0XHRpZiAocGFyYW1zLnVybCAhPSB1bmRlZmluZWQpIHtcblx0XHRcdGN0cmwuc2NvcGUuZm9ybS5zZXRGb3JtRGF0YSh7dXJsOiBwYXJhbXMudXJsfSlcblx0XHRcdHNob3dJbmZvKHBhcmFtcy51cmwpXG5cdFx0fVxuXG5cdH1cblxuXG59KTtcblxuXG5cblxuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2FwcC55dGRsJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QuaHR0cCcsICdicmVpemJvdC5icm9rZXInXSxcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcsIGh0dHAsIGJyb2tlcikge1xuXG5cdFx0bGV0IHNyY0lkXG5cblx0XHRicm9rZXIub24oJ3JlYWR5JywgKG1zZykgPT4geyBzcmNJZCA9IG1zZy5jbGllbnRJZH0pXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0aW5mbzogZnVuY3Rpb24odXJsKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldChgL2luZm9gLCB7dXJsfSlcblx0XHRcdH0sXG5cblx0XHRcdGRvd25sb2FkOiBmdW5jdGlvbih1cmwsIGZpbGVOYW1lKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9kb3dubG9hZGAsIHt1cmwsIGZpbGVOYW1lLCBzcmNJZH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRzZWFyY2g6IGZ1bmN0aW9uKHF1ZXJ5LCBtYXhSZXN1bHRzID0gMylcdHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL3NlYXJjaGAsIHtxdWVyeSwgbWF4UmVzdWx0c30pXG5cdFx0XHR9XHRcdFxuXHRcdH1cblx0fVxuXG59KTtcbiJdfQ==
