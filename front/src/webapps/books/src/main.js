$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'breizbot.http'],

	init: function (elt, pager, http) {

		let filters = {}


		const ctrl = $$.viewController(elt, {
			data: {
				books: [],
				getBooks: async function (offset) {
					return loadBooks(offset)
				},

				booksQty: 0,

				getBooksQty: function () {
					return (this.booksQty > 0) ? `${this.booksQty} books` : ''
				}
			},
			events: {
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




