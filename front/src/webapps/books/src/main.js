$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['breizbot.pager', 'breizbot.http'],

	init: function(elt, pager, http) {


		const ctrl = $$.viewController(elt, {
			data: {
				books: [],
				getBooks: async function(offset) {
					return loadBooks(offset)
				}
			},
			events: {
				onAddBook: function() {
					console.log('onAddBook')
					pager.pushPage('addBook', {
						title: 'Add Book',
						onReturn: async function(formData) {
							//console.log('formData', formData)
							await http.post('/addBook', formData)
							loadBooks()
						}
					})
				}
			}
		})


        async function loadBooks(offset) {
            offset = offset || 0

			const books = await http.get('/', {offset})
            console.log('books', offset, books)
            if (offset == 0) {
                ctrl.setData({ books })
            }
            else {
                ctrl.model.books = ctrl.model.books.concat(books)
                return books
            }
        }

		loadBooks()

	}


});




