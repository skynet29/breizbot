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

        async function getStyles() {
            const styles = await http.get('/getStyles')
            styles.unshift({ value: 'All', label: 'All', style: 'font-weight: bold;' })

            const franchises = await http.get('/getFranchises')
            franchises.unshift({ value: 'All', label: 'All', style: 'font-weight: bold;' })

            const actors = await http.get('/getActors')
            actors.unshift({ value: 'All', label: 'All', style: 'font-weight: bold;' })

            const directors = await http.get('/getDirectors')
            directors.unshift({ value: 'All', label: 'All', style: 'font-weight: bold;' })

            ctrl.setData({ styles,  franchises, actors, directors})
            ctrl.setData({ filters })
        }

        getStyles()        

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