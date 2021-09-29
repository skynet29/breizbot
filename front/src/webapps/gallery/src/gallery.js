//@ts-check
$$.control.registerControl('gallery', {

	template: {gulp_inject: './gallery.html'},

	deps: ['breizbot.files', 'breizbot.pager'],

	props: {
		rootDir: '',
		files: [],
		firstIdx: 0,
		friendUser: ''
	},

	/**
	 * 
	 * @param {Breizbot.Services.Files.Interface} filesSrv 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function(elt, filesSrv, pager) {

		/**@type {{rootDir: string, files: Breizbot.Services.Files.FileInfo[], firstIdx: number, friendUser: string}} */
		//@ts-ignore
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

		/**
		 * 
		 * @param {number} idx 
		 * @returns 
		 */
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

		this.getButtons = function() {
			return {
				play: {
					icon: 'fa fa-play',
					title: 'Play',
					onClick: startDiaporama
				},
				pause: {
					icon: 'fa fa-pause',
					title: 'Pause',
					visible: false,
					onClick: stopDiaporama
				}
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




