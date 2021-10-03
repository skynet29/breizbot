//@ts-check
$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'breizbot.http', 'breizbot.files'],

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.Http.Interface} http 
	 * @param {Breizbot.Services.Files.Interface} srvFiles 
	 */
	init: function (elt, pager, http, srvFiles) {

		let filters = {}


		const ctrl = $$.viewController(elt, {
			data: {
				books: [],
				getBooks: async function (offset) {
					return loadBooks(offset)
				},

				booksQty: 0,

				getBooksQty: function () {
					console.log('getBooksQty', this.booksQty)
					return (this.booksQty > 0) ? `${this.booksQty} books` : ''
				},

				getCoverUrl(scope) {
					return (scope.$i.cover) ?  srvFiles.fileAppThumbnailUrl(scope.$i.cover, '50x?'): '#'
				}
			},
			events: {
				onBookDetail: function() {
                    const idx = $(this).index()
                    const info = ctrl.model.books[idx]
                    //console.log('onBookDetail', info)
					pager.pushPage('showDetails', {
						title: info.title,
						props: {
							data: info
						}
					})

				},
                onItemContextMenu: function (ev, data) {
                    const idx = $(this).index()
                    //console.log('onItemContextMenu', idx, data)
                    const { cmd } = data
                    const info = ctrl.model.books[idx]
                    console.log('info', info)
					const bookId = info._id.toString()
					if (cmd == 'del') {
                        $$.ui.showConfirm({ title: 'Delete Book', content: 'Are you sure ?' }, async () => {
                            await http.post(`/deleteBook/${bookId}`)
							ctrl.removeArrayItem('books', idx, 'books')
							ctrl.model.booksQty--;
							ctrl.updateNode('booksQty')
                        })
                    }
					else if (cmd == 'edit')
					{
						pager.pushPage('addBook', {
							title: 'Edit Book',
							props: {
								data: info
							},
							onReturn: async function (formData) {
								console.log('formData', formData)
								const ret = await http.post(`/updateBook/${bookId}`, formData)
								ctrl.updateArrayItem('books', idx, ret, 'books')
							}
						})
					}
				},				
				onAddBook: function () {
					//console.log('onAddBook')
					pager.pushPage('addBook', {
						title: 'Add Book',
						onReturn: async function (formData) {
							//console.log('formData', formData)
							await http.post('/addBook', formData)
							loadBooks()
						}
					})
				},
				onFilter: function () {
					console.log('onFilter')
					pager.pushPage('filter', {
						title: 'Set Filter',
						props: {
							filters
						},
						onReturn: async function (formData) {
							//console.log('formData', formData)
							Object.keys(formData).forEach((k) => {
								if (formData[k] == 'All') {
									delete formData[k]
								}
							})
							filters = formData
							loadBooks()

						}
					})
				}
			}
		})


		async function loadBooks(offset) {
			offset = offset || 0

			const books = await http.post('/', { offset, filters })
			//console.log('books', offset, filters, books)
			if (offset == 0) {
				const { booksQty } = await http.post('/booksQty', { filters })
				ctrl.setData({ books, booksQty })
			}
			else {
				ctrl.model.books = ctrl.model.books.concat(books)
				return books
			}
		}

		loadBooks()

	}


});




