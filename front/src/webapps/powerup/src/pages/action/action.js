// @ts-check

$$.control.registerControl('action', {

    template: { gulp_inject: './action.html' },

    deps: ['breizbot.pager'],

    props: {
        data: {}
    },

    /**
     * 
     * @param {Breizbot.Services.Pager.Interface} pager 
     */
    init: function (elt, pager) {

        console.log('props', this.props)
        let { data } = this.props

        data = data || {}

        const actionTypes = ['SPEED', 'POWER', 'DBLSPEED']
        const ports = 'ABCD'.split('')

        const ctrl = $$.viewController(elt, {
            data: {
                type: data.type || 'SPEED',
                actionTypes,
                ports,
                isType: function(type) {
                    return this.type == type
                },
                isSpeed: function() {
                    return this.isType('SPEED')
                },
                isDblSpeed: function() {
                    return this.isType('DBLSPEED')
                }
            },
            events: {
                onSubmit: function (ev) {
                    ev.preventDefault()
                    console.log('data', $(this).getFormData())
                    pager.popPage($(this).getFormData())

                }
            }
        })

        ctrl.scope.form.setFormData(data)

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