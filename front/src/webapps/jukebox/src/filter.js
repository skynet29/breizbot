
$$.control.registerControl('filterDlg', {

    template: {gulp_inject: './filter.html'},

    deps: ['breizbot.pager'],

    props: {
        artists: [],
        selectedArtist: null
    },

    init: function(elt, pager) {

        const {artists, selectedArtist} = this.props

        const ctrl = $$.viewController(elt, {
            data: {
                artists: artists.sort(),
                selectedArtist
            },
            events: {
                onSubmit: function(ev) {
                    ev.preventDefault()
                    pager.popPage(ctrl.model.selectedArtist)

                }
            }
        })

        this.getButtons = function() {
            return {
                apply: {
                    title: 'Apply',
                    icon: 'fa fa-check',
                    onClick: function() {
                        ctrl.scope.submit.click()
                    }
                }
            }
        }

    }
})