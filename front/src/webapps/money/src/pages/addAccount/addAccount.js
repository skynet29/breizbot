//@ts-check
$$.control.registerControl('addAccount', {

    template: { gulp_inject: './addAccount.html' },

    deps: ['breizbot.pager'],

    props: {
        formData: {
            currency: 'euro'
        }
    },

    /**
     * 
     * @param {Breizbot.Services.Pager.Interface} pager 
     */
    init: function (elt, pager) {

        //@ts-ignore
        const { formData } = this.props

        const ctrl = $$.viewController(elt, {

            data: {
                formData
            },

            events: {
                onSubmit: function (ev) {
                    ev.preventDefault()
                    const data = $(this).getFormData()
                    //console.log('onSubmit', data)
                    pager.popPage(data)

                }
            }

        })

        this.getButtons = function () {
            return {
                apply: {
                    icon: 'fa fa-check',
                    title: 'Apply',
                    onClick: function () {
                        ctrl.scope.submit.click()
                    }
                }
            }
        }
    }
});
