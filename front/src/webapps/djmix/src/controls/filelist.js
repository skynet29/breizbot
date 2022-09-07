//@ts-check
(function () {


	function sortFiles(files) {
		files.sort((a, b) => {
			return a.artist.localeCompare(b.artist)
		})
	}

	function sortFilesByGenre(files) {
		files.sort((a, b) => {
			const genre1 = a.genre || 'WWWW'
			const genre2 = b.genre || 'WWWW'
			let ret = genre1.localeCompare(genre2)
			if (ret == 0) {
				ret = a.artist.localeCompare(b.artist)
			}
			return ret
		})
	}


	$$.control.registerControl('filelist', {
		deps: ['breizbot.files'],
		props: {
			files: []
		},

		template: { gulp_inject: './filelist.html' },

		/**
		 * 
		 * @param {*} elt 
		 * @param {Breizbot.Services.Files.Interface} srvFiles 
		 */
		init: function (elt, srvFiles) {


			let {
				files
			} = this.props

			//sortFiles(files)

			const ctrl = $$.viewController(elt, {

				data: {
					files,
					sortField: '',

					isSortedByArtist: function() {
						return this.sortField == 'artist'
					},
					isSortedByGenre: function() {
						return this.sortField == 'genre'
					},

					getDuration: function (scope) {
						const { length } = scope.f
						return (length) ? $$.media.getFormatedTime(length) : ''
					}
				},
				events: {

					onSortArtist: function() {
						sortFiles(ctrl.model.files)
						ctrl.model.sortField = 'artist'
						ctrl.update()

					},

					onSortGenre: function() {
						sortFilesByGenre(ctrl.model.files)
						ctrl.model.sortField = 'genre'
						ctrl.update()

					},

					onItemPreview: function() {
						const idx = $(this).closest('tr').index()
						const info = ctrl.model.files[idx]
						console.log('onItemPreview', idx, info)
						elt.trigger('preview', {url: info.url})
					},

					onItemClick: function (ev) {
						ev.stopPropagation()

						const idx = $(this).index()
						//console.log('idx', idx)
						const info = ctrl.model.files[idx]
						//console.log('info', info)
						$(this).closest('tbody').find('.active').removeClass('active')
						$(this).addClass('active')

						const data = {
							fileName: info.name,
							rootDir: ctrl.model.rootDir,
							isImage: info.isImage,
							mp3: info.mp3
						}

						elt.trigger('fileclick', data)
					}

				}
			})

			/**@type {JQuery<HTMLElement>} */
			const fileElt = ctrl.scope.files

			this.setData = function (data) {
				//console.log('setData', data)
				if (data.files) {
					//sortFiles(data.files)
					ctrl.setData({ files: data.files, sortField: '' })
					fileElt.find('.item').eq(0).addClass('active')
				}

			}

			this.selUp = function () {
				const selElt = fileElt.find('.active')
				const idx = selElt.index()
				//console.log('selUp', idx)
				if (idx > 0) {
					selElt.removeClass('active')
					const items = fileElt.find('.item')
					items.eq(idx - 1).addClass('active')
					if (idx - 1 > 0) {
						items.eq(idx - 2).get(0).scrollIntoViewIfNeeded()
					}
					else {
						items.eq(idx - 1).get(0).scrollIntoViewIfNeeded()
					}
					//selElt.get(0).scrollIntoView()
				}
			}

			this.selDown = function () {
				const selElt = fileElt.find('.active')
				const idx = selElt.index()
				//console.log('selDown', idx)
				if (idx < ctrl.model.files.length - 1) {
					selElt.removeClass('active')
					fileElt.find('.item').eq(idx + 1).addClass('active').get(0).scrollIntoViewIfNeeded(false)
				}
			}

			this.getSelFile = function () {
				const idx = fileElt.find('.active').index()
				//console.log('idx', idx)
				return (idx < 0) ? null : ctrl.model.files[idx]

			}

		}
	});

})();
