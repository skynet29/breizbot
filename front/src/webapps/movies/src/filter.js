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
        let filters = $.extend({ author: 'All' }, this.props.filters)

        //console.log('filters', filters)

        const ctrl = $$.viewController(elt, {
            data: {
                filters: {},
                styles: [],
                franchises: [],
                actors: [],
                directors: []
            },
            events: {
                onSubmit: function (ev) {
                    ev.preventDefault()
                    pager.popPage($(this).getFormData())

                }

            }
        })

        async function getInfos() {
            const infos = await http.get('/getInfos')
            const { styles, franchises, actors, directors } = infos

            styles.unshift({ value: 'All', label: 'All', style: 'font-weight: bold;' })
            franchises.unshift({ value: 'All', label: 'All', style: 'font-weight: bold;' })
            actors.unshift({ value: 'All', label: 'All', style: 'font-weight: bold;' })
            directors.unshift({ value: 'All', label: 'All', style: 'font-weight: bold;' })

            ctrl.setData({ styles, franchises, actors, directors })
            ctrl.setData({ filters })
        }

        getInfos()

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