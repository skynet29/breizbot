// @ts-check

$$.control.registerControl('addMovie', {

    template: { gulp_inject: './addMovie.html' },

    deps: ['breizbot.pager', 'breizbot.http'],

    props: {
        data: {}
    },

    /**
     * 
     * @param {Breizbot.Services.Pager.Interface} pager
     * @param {Breizbot.Services.Http.Interface} http
     */
    init: function (elt, pager, http) {

        const { data } = this.props

        const ctrl = $$.viewController(elt, {
            data: {
                data,
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

            ctrl.setData({ styles, franchises, actors, directors })
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