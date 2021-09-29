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
                data
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
            const franchises = await http.get('/getFranchises')
            ctrl.setData({ styles,  franchises})
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