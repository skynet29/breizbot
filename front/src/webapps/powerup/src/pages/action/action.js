// @ts-check

$$.control.registerControl('actionCtrl', {

    template: { gulp_inject: './action.html' },

    deps: ['breizbot.pager'],

    props: {
        data: null
    },

    /**
     * 
     * @param {Breizbot.Services.Pager.Interface} pager 
     */
    init: function (elt, pager) {

        console.log('props', this.props)
        let { data } = this.props

        const isEdit = (data != null)

        data = data || {}

        const actionTypes = ['SPEED', 'POWER', 'DBLSPEED']
        const ports = 'ABCD'.split('')

        const ctrl = $$.viewController(elt, {
            data: {
                isEdit,
                type: data.type || 'SPEED',
                actionTypes,
                ports,
                isType: function (type) {
                    return this.type == type
                },
                isPower: function () {
                    return this.isType('POWER')
                }, 
                isSpeed: function () {
                    return this.isType('SPEED')
                },
                isDblSpeed: function () {
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