$$.control.registerControl('importKml', {
    template: { gulp_inject: './importKml.html' },

    deps: ['breizbot.pager'],

    props: {
        kml: null
    },

    /**
     * 
     * @param {*} elt 
     * @param {Breizbot.Services.Pager.Interface} pager 
     */
    init: function (elt, pager)  {
        const { kml } = this.props

        const ctrl = $$.viewController(elt, {
            data: {
                kml
            },
            events: {
                onSelectChange: function () {
                    const checked = $(this).prop('checked')
                    console.log('onSelectChange', checked)
                    elt.find('.check').prop('checked', checked)
                },
                onSubmit: function(ev) {
                    ev.preventDefault()
                    const data = $(this).getFormData()
                    console.log('onSubmit', data)
                    const indexes = []
                    elt.find('.check').each(function(index) {
                        if ($(this).prop('checked')) {
                            indexes.push(index)
                        }
                    })
                    //console.log({indexes})
                    pager.popPage({indexes, layerLabel: data.text})
                }
            }
        })

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