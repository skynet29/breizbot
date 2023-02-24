// @ts-check

$$.control.registerControl('actionCtrl', {

    template: { gulp_inject: './action.html' },

    deps: ['breizbot.pager'],

    props: {
        steps: []
    },

    /**
     * 
     * @param {Breizbot.Services.Pager.Interface} pager 
     */
    init: function (elt, pager) {

        //console.log('actionCtrl props', this.props)
        const { steps } = this.props

        const ctrl = $$.viewController(elt, {
            data: {
                steps,
                showMenubar: function(scope) {
                    return scope.idx > 0
                }

            },
            events: {
                onRemoveStep: function() {
                    const idx = $(this).closest('.stepItem').index()
                    console.log('onRemoveStep', idx)
                    ctrl.model.steps.splice(idx, 1)
                    ctrl.update()
                }
            }
        })

        function getSteps() {
            const steps = []
            elt.find('.stepCtrl').each(function() {
                steps.push($(this).getFormData())
            })
            //console.log('steps', steps)
            return steps
        }

        this.getButtons = function () {
            return {
                addStep: {
					title: 'Add Step',
					icon: 'fa fa-plus',
					onClick: function() {
						//console.log('Add step')
                        ctrl.model.steps = getSteps()
                        ctrl.model.steps.push({})
                        ctrl.update()
					}
				},           
                apply: {
                    title: 'Apply',
                    icon: 'fas fa-check',
                    onClick: function () {
                        pager.popPage(getSteps())
                    }
                }

            }
        }
    }
})