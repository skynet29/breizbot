// @ts-check

$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'breizbot.http'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager
	 * @param {Breizbot.Services.Http.Interface}  http
	 */
	init: function (elt, pager, http) {

		let filters = {}

		const labelMap = {
			actor:     'Actor:',
			year:      'Year:',
			director:  'Director:',
			franchise: 'Franchise:',
			style: 'Style:',
			query: 'Query:'
		}

		const ctrl = $$.viewController(elt, {
			data: {
				moviesQty: 0,
				movies: [],
				getMovies: async function(offset) {
					return loadMovies(offset)
				},
				getMoviesQty: function () {
					return (this.moviesQty > 0) ? `${this.moviesQty} movies` : ''
				},
				getFilters: function() {
					return Object.entries(filters)
				},
				hasFilters: function() {
					return Object.keys(filters).length > 0
				},
				getFilterLabel(scope) {
					return labelMap[scope.$i[0]]
				},
				getFilterValue(scope) {
					return scope.$i[1]
				}

			},
			events: {
				onReload: function() {
					filters = {}
                    loadMovies()

				},
				onSearch: function() {
					pager.pushPage('search', {
						title: 'Search movies by title',
						onReturn: function(data) {
							filters = data
							loadMovies()
						}
					})
				},	
				onAction: function(ev) {
					ev.preventDefault()
					ev.stopPropagation()
					const elt = $(this)
					const idx = elt.closest('.item').index()
                    const info = ctrl.model.movies[idx]
					//console.log('onAction', info)

					if (elt.hasClass('actor1')) {
						filters = {actor: info.actor1}
					}
					else if (elt.hasClass('actor2')) {
						filters = {actor: info.actor2}
					}
					else if (elt.hasClass('director')) {
						filters = {director: info.director}
					}
					loadMovies()

				},
				onDetails: function() {
					const idx = $(this).index()
                    const info = ctrl.model.movies[idx]

					console.log('onDetails', info)
					pager.pushPage('showDetails', {
						title: info.title,
						props: {
							data: info
						}
					})

				},
				onAddMovie: function() {
					pager.pushPage('addMovie', {
						title: 'Add Movie',
						onReturn: async function(info) {
							console.log('onReturn', info)
							await http.post('/addMovie', info)
							loadMovies()
						}
					})
				},
				/**
				 * 
				 * @param {Brainjs.Controls.ContextMenu.EventData.ContextMenuChange} data 
				 */
				onItemContextMenu: function(ev, data) {
                    const idx = $(this).index()
                    //console.log('onItemContextMenu', idx, data)
                    const { cmd } = data
                    const info = ctrl.model.movies[idx]
                    //console.log('info', info)
					const movieId = info._id.toString()
					if (cmd == 'del') {
                        $$.ui.showConfirm({ title: 'Delete Movie', content: 'Are you sure ?' }, async () => {
                            await http.post(`/deleteMovie/${movieId}`)
							ctrl.removeArrayItem('movies', idx, 'movies')
							ctrl.model.moviesQty--
							ctrl.updateNode('moviesQty')
						})
                    }
					else if (cmd == 'edit')
					{
						pager.pushPage('addMovie', {
							title: 'Edit Movie',
							props: {
								data: info
							},
							onReturn: async function (formData) {
								//console.log('formData', formData)
								const ret = await http.post(`/updateMovie/${movieId}`, formData)
								ctrl.updateArrayItem('movies', idx, ret, 'movies')
							}
						})
					}


				},
				onImport: function() {
					pager.pushPage('breizbot.files', {
						title: 'Import Movies',
						/**@type {Breizbot.Controls.Files.Props} */
						props: {
							selectionEnabled: true,
							filterExtension: 'json'
						},
						events: {
							fileclick: function(ev, data) {
								pager.popPage(data)
							}
						},
						/**
						 * 
						 * @param {Breizbot.Controls.Files.EventData.FileClick} fileInfo 
						 */
						onReturn: async function(fileInfo) {
							console.log('onReturn', fileInfo)
							await http.post('/importFile', {filePath: fileInfo.rootDir + fileInfo.fileName})
							loadMovies()
						}
					})
				},
				onFilter: function () {
					//console.log('onFilter')
					pager.pushPage('filter', {
						title: 'Set Filter',
						props: {
							filters
						},
						onReturn: async function (formData) {
							//console.log('formData', formData)
							Object.keys(formData).forEach((k) => {
								if (formData[k] == 'All' || (k == 'year' && isNaN(formData[k]))) {
									delete formData[k]
								}
							})
							filters = formData
							loadMovies()

						}
					})
				}				
			}
		})

		async function loadMovies(offset) {
			offset = offset || 0
			//console.log('loadMovies', offset, filters)


			const movies = await http.post('/getMovies', { offset, filters })
			//console.log('movies', offset, filters, movies)
			if (offset == 0) {
				const { moviesQty } = await http.post('/moviesQty', { filters })
				ctrl.setData({ movies, moviesQty })
			}
			else {
				ctrl.model.movies = ctrl.model.movies.concat(movies)
				return movies
			}
		}

		loadMovies()		

	}


});




