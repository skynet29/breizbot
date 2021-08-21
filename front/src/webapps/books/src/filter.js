//@ts-check
$$.control.registerControl('filter', {

    template: { gulp_inject: './filter.html' },

    deps: ['breizbot.pager', 'breizbot.http'],

    props: {
        filters: null
    },

    /**
     * 
     * @param {Breizbot.Services.Pager.Interface} pager 
     * @param {Breizbot.Services.Http.Interface} http 
     */
    init: function (elt, pager, http) {

        //@ts-ignore
        const filters = $.extend({author: 'All'}, this.props.filters)

        //console.log('filters', filters)

        const ctrl = $$.viewController(elt, {
            data: {
                filters: {},
                authors: []
            },
            events: {
                onSubmit: function (ev) {
                    ev.preventDefault()
                    pager.popPage($(this).getFormData())

                }
            }
        })

        async function getAuthors() {
            const authors = await http.get('/authors')
            //console.log('authors', authors)
            authors.unshift({ value: 'All', label: 'All', style: 'font-weight: bold;' })
            ctrl.setData({ authors })
            ctrl.setData({ filters })
        }

        getAuthors()        

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
    }
})