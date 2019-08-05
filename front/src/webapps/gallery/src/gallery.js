$$.control.registerControl('gallery', {

	template: {gulp_inject: './gallery.html'},

	deps: ['breizbot.files'],

	props: {
		rootDir: '',
		files: [],
		firstIdx: 0
	},

	init: function(elt, filesSrv) {

		const {rootDir, files, firstIdx} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				idx: firstIdx,
				nbImages: files.length,
				src: getFileUrl(firstIdx),
				thumbnails: getThumbnailsUrl()
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
			ctrl.scope.band.find('img').eq(ctrl.model.idx).addClass('selected')
		}

		function getFileUrl(idx) {
			return filesSrv.fileUrl(rootDir + files[idx].name)
		}

		function getThumbnailsUrl() {
			return files.map((f) => filesSrv.fileThumbnailUrl(rootDir + f.name, '?x50'))
		}

	}


});




