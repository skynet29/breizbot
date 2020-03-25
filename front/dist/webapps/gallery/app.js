$$.control.registerControl('gallery', {

	template: "<div class=\"content\">\n	<div bn-control=\"brainjs.image\" bn-data=\"{src}\" bn-iface=\"image\"></div>\n	<div class=\"buttons\" bn-show=\"showButtons\">\n		<div>\n			<button \n				class=\"w3-button w3-circle w3-blue-grey\" \n				bn-show=\"show1\"\n				bn-event=\"click: onPrevImage\"\n				><i class=\"fa fa-angle-left\"></i>\n			</button>		\n		</div>\n		<div>\n			<button \n				class=\"w3-button w3-circle w3-blue-grey\"  \n				bn-show=\"show2\"\n				bn-event=\"click: onNextImage\"\n				>\n				<i class=\"fa fa-angle-right\"></i>\n			</button>	\n		</div>\n\n	</div>	\n</div>\n<div class=\"band w3-blue-grey\" bn-bind=\"band\" bn-show=\"showButtons\">\n	<div bn-each=\"thumbnails\" bn-event=\"click.image: onImageClick\" bn-style=\"{width}\">\n		<img bn-attr=\"{src: $scope.$i}\" class=\"image\">			\n	</div>\n</div>\n",

	deps: ['breizbot.files', 'breizbot.pager'],

	props: {
		rootDir: '',
		files: [],
		firstIdx: 0,
		friendUser: ''
	},

	buttons: {
		play: {icon: 'fa fa-play', title: 'Play'},
		pause: {icon: 'fa fa-pause', title: 'Pause', visible: false}
	},	

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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImdhbGxlcnkuanMiLCJtYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdnYWxsZXJ5Jywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcImNvbnRlbnRcXFwiPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmltYWdlXFxcIiBibi1kYXRhPVxcXCJ7c3JjfVxcXCIgYm4taWZhY2U9XFxcImltYWdlXFxcIj48L2Rpdj5cXG5cdDxkaXYgY2xhc3M9XFxcImJ1dHRvbnNcXFwiIGJuLXNob3c9XFxcInNob3dCdXR0b25zXFxcIj5cXG5cdFx0PGRpdj5cXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvbiB3My1jaXJjbGUgdzMtYmx1ZS1ncmV5XFxcIiBcXG5cdFx0XHRcdGJuLXNob3c9XFxcInNob3cxXFxcIlxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvblByZXZJbWFnZVxcXCJcXG5cdFx0XHRcdD48aSBjbGFzcz1cXFwiZmEgZmEtYW5nbGUtbGVmdFxcXCI+PC9pPlxcblx0XHRcdDwvYnV0dG9uPlx0XHRcXG5cdFx0PC9kaXY+XFxuXHRcdDxkaXY+XFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b24gdzMtY2lyY2xlIHczLWJsdWUtZ3JleVxcXCIgIFxcblx0XHRcdFx0Ym4tc2hvdz1cXFwic2hvdzJcXFwiXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uTmV4dEltYWdlXFxcIlxcblx0XHRcdFx0Plxcblx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWFuZ2xlLXJpZ2h0XFxcIj48L2k+XFxuXHRcdFx0PC9idXR0b24+XHRcXG5cdFx0PC9kaXY+XFxuXFxuXHQ8L2Rpdj5cdFxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcImJhbmQgdzMtYmx1ZS1ncmV5XFxcIiBibi1iaW5kPVxcXCJiYW5kXFxcIiBibi1zaG93PVxcXCJzaG93QnV0dG9uc1xcXCI+XFxuXHQ8ZGl2IGJuLWVhY2g9XFxcInRodW1ibmFpbHNcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5pbWFnZTogb25JbWFnZUNsaWNrXFxcIiBibi1zdHlsZT1cXFwie3dpZHRofVxcXCI+XFxuXHRcdDxpbWcgYm4tYXR0cj1cXFwie3NyYzogJHNjb3BlLiRpfVxcXCIgY2xhc3M9XFxcImltYWdlXFxcIj5cdFx0XHRcXG5cdDwvZGl2PlxcbjwvZGl2PlxcblwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHRcdHJvb3REaXI6ICcnLFxuXHRcdGZpbGVzOiBbXSxcblx0XHRmaXJzdElkeDogMCxcblx0XHRmcmllbmRVc2VyOiAnJ1xuXHR9LFxuXG5cdGJ1dHRvbnM6IHtcblx0XHRwbGF5OiB7aWNvbjogJ2ZhIGZhLXBsYXknLCB0aXRsZTogJ1BsYXknfSxcblx0XHRwYXVzZToge2ljb246ICdmYSBmYS1wYXVzZScsIHRpdGxlOiAnUGF1c2UnLCB2aXNpYmxlOiBmYWxzZX1cblx0fSxcdFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgZmlsZXNTcnYsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCB7cm9vdERpciwgZmlsZXMsIGZpcnN0SWR4LCBmcmllbmRVc2VyfSA9IHRoaXMucHJvcHNcblx0XHRjb25zdCBkaWFwb3JhbWFJbnRlcnZhbCA9IDEwICogMTAwMCAvLyAxMCBzZWNcblxuXHRcdGxldCB0aW1lcklkXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGlkeDogZmlyc3RJZHgsXG5cdFx0XHRcdG5iSW1hZ2VzOiBmaWxlcy5sZW5ndGgsXG5cdFx0XHRcdHNyYzogZ2V0RmlsZVVybChmaXJzdElkeCksXG5cdFx0XHRcdHRodW1ibmFpbHM6IGdldFRodW1ibmFpbHNVcmwoKSxcblx0XHRcdFx0d2lkdGg6IGdldFRodW1ibmFpbFdpZHRoKCkgKyAncHgnLFxuXHRcdFx0XHRzaG93QnV0dG9uczogdHJ1ZSxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmlkeCA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmlkeCA8IHRoaXMubmJJbWFnZXMgLSAxXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25QcmV2SW1hZ2U6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uUHJldkltYWdlJylcblx0XHRcdFx0XHRjdHJsLm1vZGVsLmlkeC0tO1xuXHRcdFx0XHRcdHVwZGF0ZVNlbGVjdGlvbigpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTmV4dEltYWdlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbk5leHRJbWFnZScpXG5cdFx0XHRcdFx0Y3RybC5tb2RlbC5pZHgrKztcblx0XHRcdFx0XHR1cGRhdGVTZWxlY3Rpb24oKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkltYWdlQ2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuaW5kZXgoKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uSW1hZ2VDbGljaycsIGlkeClcblx0XHRcdFx0XHRjdHJsLm1vZGVsLmlkeCA9IGlkeDtcblx0XHRcdFx0XHR1cGRhdGVTZWxlY3Rpb24oKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdHVwZGF0ZVNlbGVjdGlvbigpXG5cblx0XHRmdW5jdGlvbiB1cGRhdGVTZWxlY3Rpb24oKSB7XG5cdFx0XHRjdHJsLnNldERhdGEoe3NyYzogZ2V0RmlsZVVybChjdHJsLm1vZGVsLmlkeCl9KVxuXHRcdFx0Y3RybC5zY29wZS5iYW5kLmZpbmQoJ2ltZy5zZWxlY3RlZCcpLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCcpXG5cdFx0XHRjb25zdCAkaW1nID0gY3RybC5zY29wZS5iYW5kLmZpbmQoJ2ltZycpLmVxKGN0cmwubW9kZWwuaWR4KVxuXHRcdFx0JGltZy5hZGRDbGFzcygnc2VsZWN0ZWQnKVxuXHRcdFx0JGltZy5nZXQoMCkuc2Nyb2xsSW50b1ZpZXcoKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldEZpbGVVcmwoaWR4KSB7XG5cdFx0XHRyZXR1cm4gZmlsZXNTcnYuZmlsZVVybChyb290RGlyICsgZmlsZXNbaWR4XS5uYW1lLCBmcmllbmRVc2VyKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldFRodW1ibmFpbHNVcmwoKSB7XG5cdFx0XHRyZXR1cm4gZmlsZXMubWFwKChmKSA9PiBmaWxlc1Nydi5maWxlVGh1bWJuYWlsVXJsKHJvb3REaXIgKyBmLm5hbWUsICc/eDUwJywgZnJpZW5kVXNlcikpXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0VGh1bWJuYWlsV2lkdGgoKSB7XG5cdFx0XHRyZXR1cm4gZmlsZXMucmVkdWNlKCh0b3RhbCwgZikgPT4ge1xuXHRcdFx0XHRjb25zdCB7d2lkdGgsIGhlaWdodH0gPSBmLmRpbWVuc2lvblxuXHRcdFx0XHRyZXR1cm4gdG90YWwgKyAod2lkdGggKiA1MCAvIGhlaWdodCkgKyA1XG5cdFx0XHR9LCAwKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHN0b3BEaWFwb3JhbWEoKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdzdG9wRGlhcG9yYW1hJylcblx0XHRcdGNsZWFySW50ZXJ2YWwodGltZXJJZClcblx0XHRcdHBhZ2VyLnNldEJ1dHRvblZpc2libGUoe3BsYXk6IHRydWUsIHBhdXNlOiBmYWxzZX0pXG5cdFx0XHRjdHJsLnNldERhdGEoe3Nob3dCdXR0b25zOiB0cnVlfSlcblx0XHRcdGN0cmwuc2NvcGUuaW1hZ2UuZW5hYmxlSGFuZGxlcnModHJ1ZSlcblx0XHRcdGN0cmwuc2NvcGUuaW1hZ2UuaW52YWxpZGF0ZVNpemUoKVxuXHRcdFx0dGltZXJJZCA9IHVuZGVmaW5lZFx0XHRcdFxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHN0YXJ0RGlhcG9yYW1hKCkge1xuXHRcdFx0cGFnZXIuc2V0QnV0dG9uVmlzaWJsZSh7cGxheTogZmFsc2UsIHBhdXNlOiB0cnVlfSlcblx0XHRcdGN0cmwuc2V0RGF0YSh7c2hvd0J1dHRvbnM6IGZhbHNlfSlcblx0XHRcdGN0cmwuc2NvcGUuaW1hZ2UuZW5hYmxlSGFuZGxlcnMoZmFsc2UpXG5cdFx0XHRjdHJsLnNjb3BlLmltYWdlLmludmFsaWRhdGVTaXplKClcblx0XHRcdGlmIChjdHJsLm1vZGVsLmlkeCA9PSBjdHJsLm1vZGVsLm5iSW1hZ2VzIC0gMSkge1xuXHRcdFx0XHRjdHJsLm1vZGVsLmlkeCA9IDBcblx0XHRcdFx0dXBkYXRlU2VsZWN0aW9uKClcblx0XHRcdH1cblxuXHRcdFx0dGltZXJJZCA9IHNldEludGVydmFsKCgpID0+IHtcblx0XHRcdFx0aWYgKGN0cmwubW9kZWwuaWR4ID09IGN0cmwubW9kZWwubmJJbWFnZXMgLSAxKSB7XG5cdFx0XHRcdFx0c3RvcERpYXBvcmFtYSgpXG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y3RybC5tb2RlbC5pZHgrK1xuXHRcdFx0XHRcdHVwZGF0ZVNlbGVjdGlvbigpXG5cdFx0XHRcdH1cblxuXHRcdFx0fSwgZGlhcG9yYW1hSW50ZXJ2YWwpXG5cblx0XHR9XG5cblx0XHR0aGlzLm9uQWN0aW9uID0gZnVuY3Rpb24oYWN0aW9uKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdvbkFjdGlvbicsIGFjdGlvbilcblx0XHRcdGlmIChhY3Rpb24gPT0gJ3BsYXknKSB7XG5cdFx0XHRcdHN0YXJ0RGlhcG9yYW1hKClcblx0XHRcdH1cblxuXHRcdFx0aWYgKGFjdGlvbiA9PSAncGF1c2UnKSB7XG5cdFx0XHRcdHN0b3BEaWFwb3JhbWEoKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuZGlzcG9zZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnZGlzcG9zZScpXG5cdFx0XHRpZiAodGltZXJJZCAhPSB1bmRlZmluZWQpIHtcblx0XHRcdFx0Y2xlYXJJbnRlcnZhbCh0aW1lcklkKVxuXHRcdFx0fVxuXHRcdH1cblxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8cD5TZWxlY3QgYSBmaWxlIHN5c3RlbTwvcD5cXG48dWwgY2xhc3M9XFxcInczLXVsIHczLWJvcmRlciB3My13aGl0ZVxcXCI+XFxuXHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkhvbWVcXFwiPlxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJ3My1iYXItaXRlbVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWhvbWUgZmEtMnggZmEtZncgdzMtdGV4dC1ibHVlXFxcIj48L2k+XFxuXHRcdFx0PHNwYW4+WW91ciBob21lIGZpbGVzPC9zcGFuPlxcblx0XHQ8L2Rpdj5cXG5cdDwvbGk+XFxuXFxuXHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblNoYXJlXFxcIj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1zaGFyZS1hbHQgZmEtMnggZmEtZncgdzMtdGV4dC1ibHVlXFxcIj48L2k+XFxuXHRcdFx0PHNwYW4+RmlsZXMgc2hhcmVkIGJ5IHlvdXIgZnJpZW5kczwvc3Bhbj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2xpPlxcbjwvdWw+XHRcIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBwYWdlcikge1xuXG5cdFx0ZnVuY3Rpb24gb3BlbkZpbGVQYWdlKHRpdGxlLCBmcmllbmRVc2VyKSB7XG5cdFx0XHRwYWdlci5wdXNoUGFnZSgnYnJlaXpib3QuZmlsZXMnLCB7XG5cdFx0XHRcdHRpdGxlLFxuXHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdGltYWdlT25seTogdHJ1ZSxcblx0XHRcdFx0XHRmcmllbmRVc2VyXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRcdGZpbGVjbGljazogZnVuY3Rpb24oZXYsIGluZm8pIHtcblx0XHRcdFx0XHRcdGNvbnN0IHtyb290RGlyLCBmaWxlTmFtZSB9ID0gaW5mb1xuXHRcdFx0XHRcdFx0Y29uc3QgZmlsZXMgPSAkKHRoaXMpLmlmYWNlKCkuZ2V0RmlsZXMoKVxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlsZXMnLCBmaWxlcylcblx0XHRcdFx0XHRcdGNvbnN0IGZpcnN0SWR4ID0gZmlsZXMuZmluZEluZGV4KChmKSA9PiBmLm5hbWUgPT0gZmlsZU5hbWUpXG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaXJzdElkeCcsIGZpcnN0SWR4KVxuXHRcdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2dhbGxlcnknLCB7XG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnRGlhcG9yYW1hJyxcblx0XHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0XHRmaXJzdElkeCxcblx0XHRcdFx0XHRcdFx0XHRmaWxlcyxcblx0XHRcdFx0XHRcdFx0XHRyb290RGlyLFxuXHRcdFx0XHRcdFx0XHRcdGZyaWVuZFVzZXJcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSlcblx0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XHRcblx0XHRcdH0pXHRcdFx0XHRcblxuXHRcdH1cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25Ib21lOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRvcGVuRmlsZVBhZ2UoJ0hvbWUgZmlsZXMnLCAnJylcblx0XHRcdFx0fSxcblx0XHRcdFx0b25TaGFyZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmZyaWVuZHMnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ1NoYXJlZCBmaWxlcycsXG5cdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRzaG93Q29ubmVjdGlvblN0YXRlOiBmYWxzZVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRcdFx0XHRmcmllbmRjbGljazogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblNlbGVjdEZyaWVuZCcsIGRhdGEpXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3Qge3VzZXJOYW1lfSA9IGRhdGFcblx0XHRcdFx0XHRcdFx0XHRvcGVuRmlsZVBhZ2UodXNlck5hbWUsIHVzZXJOYW1lKVx0XHRcdFxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iXX0=
