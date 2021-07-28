$$.control.registerControl('addBook', {

    template: { gulp_inject: './addBook.html' },

    deps: ['breizbot.pager', 'breizbot.http'],

    props: {
        data: {},
        authors: [],
        series: []
    },

    init: function (elt, pager, http) {

        const { data } = this.props

        const ctrl = $$.viewController(elt, {
            data: {
                data
            },
            events: {
                onSubmit: function (ev) {
                    ev.preventDefault()
                    pager.popPage($(this).getFormData())

                },

                onAuthorChange: async function(ev, ui) {
                    console.log('onAuthorChange', ui.item.value)
                    await getSeries(ui.item.value)
                }
            }
        })

        this.getButtons = function () {
            return {
                apply: {
                    title: 'Apply',
                    icon: 'fas fa-check',
                    onClick: function () {
                        ctrl.scope.submit.click()
                    }
                }
            }
        }

        async function getAuthors() {
            const authors = await http.get('/authors')
            console.log('authors', authors)
            ctrl.setData({ authors })
        }

        async function getSeries(author) {
            const series = await http.post('/series', {author})
            console.log('series', series)
            ctrl.setData({ series })

        }

        getAuthors()
    }
})