$$.control.registerControl('gallery', {

	template: "<div class=\"content\">\n	<div bn-control=\"brainjs.image\" bn-data=\"{src}\" bn-iface=\"image\"></div>\n	<div class=\"buttons\" bn-show=\"showButtons\">\n		<div>\n			<button \n				class=\"w3-button w3-circle w3-blue-grey\" \n				bn-show=\"show1\"\n				bn-event=\"click: onPrevImage\"\n				><i class=\"fa fa-angle-left\"></i>\n			</button>		\n		</div>\n		<div>\n			<button \n				class=\"w3-button w3-circle w3-blue-grey\"  \n				bn-show=\"show2\"\n				bn-event=\"click: onNextImage\"\n				>\n				<i class=\"fa fa-angle-right\"></i>\n			</button>	\n		</div>\n\n	</div>	\n</div>\n<div class=\"band w3-blue-grey\" bn-bind=\"band\" bn-show=\"showButtons\">\n	<div bn-each=\"thumbnails\" bn-event=\"click.image: onImageClick\" bn-style=\"{width}\">\n		<img bn-attr=\"{src: $scope.$i}\" class=\"image\">			\n	</div>\n</div>\n",

	deps: ['breizbot.files', 'breizbot.pager'],

	props: {
		rootDir: '',
		files: [],
		firstIdx: 0,
		friendUser: ''
	},

	buttons: [
		{name: 'play', icon: 'fa fa-play', title: 'Play'},
		{name: 'pause', icon: 'fa fa-pause', title: 'Pause', visible: false}
	],	

	init: function(elt, filesSrv, pager) {

		const {rootDir, files, firstIdx, friendUser} = this.props
		const diaporamaInterval = 10 * 1000 // 10 sec

		let timerId

		const ctrl = $$.viewController(elt, {
			data: {
				idx: firstIdx,
				nbImages: files.length,
				src: getFileUrl(firstIdx),
				thumbnails: getThumbnailsUrl(),
				width: getThumbnailWidth() + 'px',
				showButtons: true,
				show1: function() {
					return this.idx > 0
				},
				show2: function() {
					return this.idx < this.nbImages - 1
				}
			},
			events: {
				onPrevImage: function() {
					//console.log('onPrevImage')
					ctrl.model.idx--;
					updateSelection()
				},
				onNextImage: function() {
					//console.log('onNextImage')
					ctrl.model.idx++;
					updateSelection()
				},
				onImageClick: function() {
					const idx = $(this).index()
					//console.log('onImageClick', idx)
					ctrl.model.idx = idx;
					updateSelection()
				}
			}
		})

		updateSelection()

		function updateSelection() {
			ctrl.setData({src: getFileUrl(ctrl.model.idx)})
			ctrl.scope.band.find('img.selected').removeClass('selected')
			const $img = ctrl.scope.band.find('img').eq(ctrl.model.idx)
			$img.addClass('selected')
			$img.get(0).scrollIntoView()
		}

		function getFileUrl(idx) {
			return filesSrv.fileUrl(rootDir + files[idx].name, friendUser)
		}

		function getThumbnailsUrl() {
			return files.map((f) => filesSrv.fileThumbnailUrl(rootDir + f.name, '?x50', friendUser))
		}

		function getThumbnailWidth() {
			return files.reduce((total, f) => {
				const {width, height} = f.dimension
				return total + (width * 50 / height) + 5
			}, 0)
		}

		function stopDiaporama() {
			//console.log('stopDiaporama')
			clearInterval(timerId)
			pager.setButtonVisible({play: true, pause: false})
			ctrl.setData({showButtons: true})
			ctrl.scope.image.enableHandlers(true)
			ctrl.scope.image.invalidateSize()
			timerId = undefined			
		}

		function startDiaporama() {
			pager.setButtonVisible({play: false, pause: true})
			ctrl.setData({showButtons: false})
			ctrl.scope.image.enableHandlers(false)
			ctrl.scope.image.invalidateSize()
			if (ctrl.model.idx == ctrl.model.nbImages - 1) {
				ctrl.model.idx = 0
				updateSelection()
			}

			timerId = setInterval(() => {
				if (ctrl.model.idx == ctrl.model.nbImages - 1) {
					stopDiaporama()
				}
				else {
					ctrl.model.idx++
					updateSelection()
				}

			}, diaporamaInterval)

		}

		this.onAction = function(action) {
			//console.log('onAction', action)
			if (action == 'play') {
				startDiaporama()
			}

			if (action == 'pause') {
				stopDiaporama()
			}
		}

		this.dispose = function() {
			//console.log('dispose')
			if (timerId != undefined) {
				clearInterval(timerId)
			}
		}

	}


});





$$.control.registerControl('rootPage', {

	template: "<p>Select a file system</p>\n<ul class=\"w3-ul w3-border w3-white\">\n	<li class=\"w3-bar\" bn-event=\"click: onHome\">\n		<div class=\"w3-bar-item\">\n			<i class=\"fa fa-home fa-2x fa-fw w3-text-blue\"></i>\n			<span>Your home files</span>\n		</div>\n	</li>\n\n	<li class=\"w3-bar\" bn-event=\"click: onShare\">\n		<div class=\"w3-bar-item\">\n			<i class=\"fa fa-share-alt fa-2x fa-fw w3-text-blue\"></i>\n			<span>Files shared by your friends</span>\n		</div>\n	</li>\n</ul>	",

	deps: ['breizbot.pager'],

	init: function(elt, pager) {

		function openFilePage(title, friendUser) {
			pager.pushPage('breizbot.files', {
				title,
				props: {
					imageOnly: true,
					friendUser
				},
				events: {
					fileclick: function(ev, info) {
						const {rootDir, fileName } = info
						const files = $(this).iface().getFiles()
						//console.log('files', files)
						const firstIdx = files.findIndex((f) => f.name == fileName)
						//console.log('firstIdx', firstIdx)
						pager.pushPage('gallery', {
							title: 'Diaporama',
							props: {
								firstIdx,
								files,
								rootDir,
								friendUser
							}
						})
	
					}
				}	
			})				

		}

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onHome: function() {
					openFilePage('Home files', '')
				},
				onShare: function() {
					pager.pushPage('breizbot.friends', {
						title: 'Shared files',
						props: {
							showConnectionState: false
						},
						events: {
							friendclick: function(ev, data) {
								//console.log('onSelectFriend', data)
								const {userName} = data
								openFilePage(userName, userName)			
							}
						}					
					})
				}

			}
		})

	}


});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImdhbGxlcnkuanMiLCJtYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdnYWxsZXJ5Jywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcImNvbnRlbnRcXFwiPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmltYWdlXFxcIiBibi1kYXRhPVxcXCJ7c3JjfVxcXCIgYm4taWZhY2U9XFxcImltYWdlXFxcIj48L2Rpdj5cXG5cdDxkaXYgY2xhc3M9XFxcImJ1dHRvbnNcXFwiIGJuLXNob3c9XFxcInNob3dCdXR0b25zXFxcIj5cXG5cdFx0PGRpdj5cXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvbiB3My1jaXJjbGUgdzMtYmx1ZS1ncmV5XFxcIiBcXG5cdFx0XHRcdGJuLXNob3c9XFxcInNob3cxXFxcIlxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvblByZXZJbWFnZVxcXCJcXG5cdFx0XHRcdD48aSBjbGFzcz1cXFwiZmEgZmEtYW5nbGUtbGVmdFxcXCI+PC9pPlxcblx0XHRcdDwvYnV0dG9uPlx0XHRcXG5cdFx0PC9kaXY+XFxuXHRcdDxkaXY+XFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b24gdzMtY2lyY2xlIHczLWJsdWUtZ3JleVxcXCIgIFxcblx0XHRcdFx0Ym4tc2hvdz1cXFwic2hvdzJcXFwiXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uTmV4dEltYWdlXFxcIlxcblx0XHRcdFx0Plxcblx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWFuZ2xlLXJpZ2h0XFxcIj48L2k+XFxuXHRcdFx0PC9idXR0b24+XHRcXG5cdFx0PC9kaXY+XFxuXFxuXHQ8L2Rpdj5cdFxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcImJhbmQgdzMtYmx1ZS1ncmV5XFxcIiBibi1iaW5kPVxcXCJiYW5kXFxcIiBibi1zaG93PVxcXCJzaG93QnV0dG9uc1xcXCI+XFxuXHQ8ZGl2IGJuLWVhY2g9XFxcInRodW1ibmFpbHNcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5pbWFnZTogb25JbWFnZUNsaWNrXFxcIiBibi1zdHlsZT1cXFwie3dpZHRofVxcXCI+XFxuXHRcdDxpbWcgYm4tYXR0cj1cXFwie3NyYzogJHNjb3BlLiRpfVxcXCIgY2xhc3M9XFxcImltYWdlXFxcIj5cdFx0XHRcXG5cdDwvZGl2PlxcbjwvZGl2PlxcblwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHRcdHJvb3REaXI6ICcnLFxuXHRcdGZpbGVzOiBbXSxcblx0XHRmaXJzdElkeDogMCxcblx0XHRmcmllbmRVc2VyOiAnJ1xuXHR9LFxuXG5cdGJ1dHRvbnM6IFtcblx0XHR7bmFtZTogJ3BsYXknLCBpY29uOiAnZmEgZmEtcGxheScsIHRpdGxlOiAnUGxheSd9LFxuXHRcdHtuYW1lOiAncGF1c2UnLCBpY29uOiAnZmEgZmEtcGF1c2UnLCB0aXRsZTogJ1BhdXNlJywgdmlzaWJsZTogZmFsc2V9XG5cdF0sXHRcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIGZpbGVzU3J2LCBwYWdlcikge1xuXG5cdFx0Y29uc3Qge3Jvb3REaXIsIGZpbGVzLCBmaXJzdElkeCwgZnJpZW5kVXNlcn0gPSB0aGlzLnByb3BzXG5cdFx0Y29uc3QgZGlhcG9yYW1hSW50ZXJ2YWwgPSAxMCAqIDEwMDAgLy8gMTAgc2VjXG5cblx0XHRsZXQgdGltZXJJZFxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRpZHg6IGZpcnN0SWR4LFxuXHRcdFx0XHRuYkltYWdlczogZmlsZXMubGVuZ3RoLFxuXHRcdFx0XHRzcmM6IGdldEZpbGVVcmwoZmlyc3RJZHgpLFxuXHRcdFx0XHR0aHVtYm5haWxzOiBnZXRUaHVtYm5haWxzVXJsKCksXG5cdFx0XHRcdHdpZHRoOiBnZXRUaHVtYm5haWxXaWR0aCgpICsgJ3B4Jyxcblx0XHRcdFx0c2hvd0J1dHRvbnM6IHRydWUsXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5pZHggPiAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cyOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5pZHggPCB0aGlzLm5iSW1hZ2VzIC0gMVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uUHJldkltYWdlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblByZXZJbWFnZScpXG5cdFx0XHRcdFx0Y3RybC5tb2RlbC5pZHgtLTtcblx0XHRcdFx0XHR1cGRhdGVTZWxlY3Rpb24oKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbk5leHRJbWFnZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25OZXh0SW1hZ2UnKVxuXHRcdFx0XHRcdGN0cmwubW9kZWwuaWR4Kys7XG5cdFx0XHRcdFx0dXBkYXRlU2VsZWN0aW9uKClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25JbWFnZUNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmluZGV4KClcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkltYWdlQ2xpY2snLCBpZHgpXG5cdFx0XHRcdFx0Y3RybC5tb2RlbC5pZHggPSBpZHg7XG5cdFx0XHRcdFx0dXBkYXRlU2VsZWN0aW9uKClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHR1cGRhdGVTZWxlY3Rpb24oKVxuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlU2VsZWN0aW9uKCkge1xuXHRcdFx0Y3RybC5zZXREYXRhKHtzcmM6IGdldEZpbGVVcmwoY3RybC5tb2RlbC5pZHgpfSlcblx0XHRcdGN0cmwuc2NvcGUuYmFuZC5maW5kKCdpbWcuc2VsZWN0ZWQnKS5yZW1vdmVDbGFzcygnc2VsZWN0ZWQnKVxuXHRcdFx0Y29uc3QgJGltZyA9IGN0cmwuc2NvcGUuYmFuZC5maW5kKCdpbWcnKS5lcShjdHJsLm1vZGVsLmlkeClcblx0XHRcdCRpbWcuYWRkQ2xhc3MoJ3NlbGVjdGVkJylcblx0XHRcdCRpbWcuZ2V0KDApLnNjcm9sbEludG9WaWV3KClcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRGaWxlVXJsKGlkeCkge1xuXHRcdFx0cmV0dXJuIGZpbGVzU3J2LmZpbGVVcmwocm9vdERpciArIGZpbGVzW2lkeF0ubmFtZSwgZnJpZW5kVXNlcilcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRUaHVtYm5haWxzVXJsKCkge1xuXHRcdFx0cmV0dXJuIGZpbGVzLm1hcCgoZikgPT4gZmlsZXNTcnYuZmlsZVRodW1ibmFpbFVybChyb290RGlyICsgZi5uYW1lLCAnP3g1MCcsIGZyaWVuZFVzZXIpKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldFRodW1ibmFpbFdpZHRoKCkge1xuXHRcdFx0cmV0dXJuIGZpbGVzLnJlZHVjZSgodG90YWwsIGYpID0+IHtcblx0XHRcdFx0Y29uc3Qge3dpZHRoLCBoZWlnaHR9ID0gZi5kaW1lbnNpb25cblx0XHRcdFx0cmV0dXJuIHRvdGFsICsgKHdpZHRoICogNTAgLyBoZWlnaHQpICsgNVxuXHRcdFx0fSwgMClcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzdG9wRGlhcG9yYW1hKCkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnc3RvcERpYXBvcmFtYScpXG5cdFx0XHRjbGVhckludGVydmFsKHRpbWVySWQpXG5cdFx0XHRwYWdlci5zZXRCdXR0b25WaXNpYmxlKHtwbGF5OiB0cnVlLCBwYXVzZTogZmFsc2V9KVxuXHRcdFx0Y3RybC5zZXREYXRhKHtzaG93QnV0dG9uczogdHJ1ZX0pXG5cdFx0XHRjdHJsLnNjb3BlLmltYWdlLmVuYWJsZUhhbmRsZXJzKHRydWUpXG5cdFx0XHRjdHJsLnNjb3BlLmltYWdlLmludmFsaWRhdGVTaXplKClcblx0XHRcdHRpbWVySWQgPSB1bmRlZmluZWRcdFx0XHRcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzdGFydERpYXBvcmFtYSgpIHtcblx0XHRcdHBhZ2VyLnNldEJ1dHRvblZpc2libGUoe3BsYXk6IGZhbHNlLCBwYXVzZTogdHJ1ZX0pXG5cdFx0XHRjdHJsLnNldERhdGEoe3Nob3dCdXR0b25zOiBmYWxzZX0pXG5cdFx0XHRjdHJsLnNjb3BlLmltYWdlLmVuYWJsZUhhbmRsZXJzKGZhbHNlKVxuXHRcdFx0Y3RybC5zY29wZS5pbWFnZS5pbnZhbGlkYXRlU2l6ZSgpXG5cdFx0XHRpZiAoY3RybC5tb2RlbC5pZHggPT0gY3RybC5tb2RlbC5uYkltYWdlcyAtIDEpIHtcblx0XHRcdFx0Y3RybC5tb2RlbC5pZHggPSAwXG5cdFx0XHRcdHVwZGF0ZVNlbGVjdGlvbigpXG5cdFx0XHR9XG5cblx0XHRcdHRpbWVySWQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG5cdFx0XHRcdGlmIChjdHJsLm1vZGVsLmlkeCA9PSBjdHJsLm1vZGVsLm5iSW1hZ2VzIC0gMSkge1xuXHRcdFx0XHRcdHN0b3BEaWFwb3JhbWEoKVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGN0cmwubW9kZWwuaWR4Kytcblx0XHRcdFx0XHR1cGRhdGVTZWxlY3Rpb24oKVxuXHRcdFx0XHR9XG5cblx0XHRcdH0sIGRpYXBvcmFtYUludGVydmFsKVxuXG5cdFx0fVxuXG5cdFx0dGhpcy5vbkFjdGlvbiA9IGZ1bmN0aW9uKGFjdGlvbikge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnb25BY3Rpb24nLCBhY3Rpb24pXG5cdFx0XHRpZiAoYWN0aW9uID09ICdwbGF5Jykge1xuXHRcdFx0XHRzdGFydERpYXBvcmFtYSgpXG5cdFx0XHR9XG5cblx0XHRcdGlmIChhY3Rpb24gPT0gJ3BhdXNlJykge1xuXHRcdFx0XHRzdG9wRGlhcG9yYW1hKClcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLmRpc3Bvc2UgPSBmdW5jdGlvbigpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ2Rpc3Bvc2UnKVxuXHRcdFx0aWYgKHRpbWVySWQgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdGNsZWFySW50ZXJ2YWwodGltZXJJZClcblx0XHRcdH1cblx0XHR9XG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncm9vdFBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPHA+U2VsZWN0IGEgZmlsZSBzeXN0ZW08L3A+XFxuPHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGVcXFwiPlxcblx0PGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25Ib21lXFxcIj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1ob21lIGZhLTJ4IGZhLWZ3IHczLXRleHQtYmx1ZVxcXCI+PC9pPlxcblx0XHRcdDxzcGFuPllvdXIgaG9tZSBmaWxlczwvc3Bhbj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2xpPlxcblxcblx0PGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25TaGFyZVxcXCI+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtc2hhcmUtYWx0IGZhLTJ4IGZhLWZ3IHczLXRleHQtYmx1ZVxcXCI+PC9pPlxcblx0XHRcdDxzcGFuPkZpbGVzIHNoYXJlZCBieSB5b3VyIGZyaWVuZHM8L3NwYW4+XFxuXHRcdDwvZGl2Plxcblx0PC9saT5cXG48L3VsPlx0XCIsXG5cblx0ZGVwczogWydicmVpemJvdC5wYWdlciddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgcGFnZXIpIHtcblxuXHRcdGZ1bmN0aW9uIG9wZW5GaWxlUGFnZSh0aXRsZSwgZnJpZW5kVXNlcikge1xuXHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmZpbGVzJywge1xuXHRcdFx0XHR0aXRsZSxcblx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRpbWFnZU9ubHk6IHRydWUsXG5cdFx0XHRcdFx0ZnJpZW5kVXNlclxuXHRcdFx0XHR9LFxuXHRcdFx0XHRldmVudHM6IHtcblx0XHRcdFx0XHRmaWxlY2xpY2s6IGZ1bmN0aW9uKGV2LCBpbmZvKSB7XG5cdFx0XHRcdFx0XHRjb25zdCB7cm9vdERpciwgZmlsZU5hbWUgfSA9IGluZm9cblx0XHRcdFx0XHRcdGNvbnN0IGZpbGVzID0gJCh0aGlzKS5pZmFjZSgpLmdldEZpbGVzKClcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbGVzJywgZmlsZXMpXG5cdFx0XHRcdFx0XHRjb25zdCBmaXJzdElkeCA9IGZpbGVzLmZpbmRJbmRleCgoZikgPT4gZi5uYW1lID09IGZpbGVOYW1lKVxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlyc3RJZHgnLCBmaXJzdElkeClcblx0XHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdnYWxsZXJ5Jywge1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ0RpYXBvcmFtYScsXG5cdFx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdFx0Zmlyc3RJZHgsXG5cdFx0XHRcdFx0XHRcdFx0ZmlsZXMsXG5cdFx0XHRcdFx0XHRcdFx0cm9vdERpcixcblx0XHRcdFx0XHRcdFx0XHRmcmllbmRVc2VyXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pXG5cdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVx0XG5cdFx0XHR9KVx0XHRcdFx0XG5cblx0XHR9XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uSG9tZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0b3BlbkZpbGVQYWdlKCdIb21lIGZpbGVzJywgJycpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uU2hhcmU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdicmVpemJvdC5mcmllbmRzJywge1xuXHRcdFx0XHRcdFx0dGl0bGU6ICdTaGFyZWQgZmlsZXMnLFxuXHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0c2hvd0Nvbm5lY3Rpb25TdGF0ZTogZmFsc2Vcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRldmVudHM6IHtcblx0XHRcdFx0XHRcdFx0ZnJpZW5kY2xpY2s6IGZ1bmN0aW9uKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25TZWxlY3RGcmllbmQnLCBkYXRhKVxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHt1c2VyTmFtZX0gPSBkYXRhXG5cdFx0XHRcdFx0XHRcdFx0b3BlbkZpbGVQYWdlKHVzZXJOYW1lLCB1c2VyTmFtZSlcdFx0XHRcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVx0XHRcdFx0XHRcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdH1cblxuXG59KTtcblxuXG5cblxuIl19
