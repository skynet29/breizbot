$$.control.registerControl('gallery', {

	template: {gulp_inject: './gallery.html'},

	deps: ['breizbot.files'],

	props: {
		rootDir: '',
		files: [],
		firstIdx: 0,
		friendUser: '',
		$pager: null
	},

	buttons: [
		{name: 'play', icon: 'fa fa-play', title: 'Play'},
		{name: 'pause', icon: 'fa fa-pause', title: 'Pause', visible: false}
	],	

	init: function(elt, filesSrv) {

		const {rootDir, files, firstIdx, $pager, friendUser} = this.props
		const diaporamaInterval = 20 * 1000;

		let timerId

		const ctrl = $$.viewController(elt, {
			data: {
				idx: firstIdx,
				nbImages: files.length,
				src: getFileUrl(firstIdx),
				thumbnails: getThumbnailsUrl(),
				width: getThumbnailWidth() + 'px',
				showButtons: true
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
			$pager.setButtonVisible({play: true, pause: false})
			ctrl.setData({showButtons: true})
			ctrl.scope.image.enableHandlers(true)
			ctrl.scope.image.invalidateSize()
			timerId = undefined			
		}

		function startDiaporama() {
			$pager.setButtonVisible({play: false, pause: true})
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




