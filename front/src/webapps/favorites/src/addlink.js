$$.control.registerControl('addLink', {

    template: {gulp_inject: './addlink.html'},

    deps: ['breizbot.pager'],

    init: function(elt, pager) {

        const ctrl = $$.viewController(elt, {
            events: {
                onSubmit: function(ev) {
                    ev.preventDefault()
                    pager.popPage($(this).getFormData())

                }
            }
        })

        this.getButtons = function() {
            return {
                apply: {
                    title: 'Apply',
                    icon: 'fas fa-check',
                    onClick: function() {
                        ctrl.scope.submit.click()
                    }
                }
            }
        }
    }
})