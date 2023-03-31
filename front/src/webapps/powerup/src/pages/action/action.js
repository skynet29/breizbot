// @ts-check

$$.control.registerControl('actionCtrl', {

    template: { gulp_inject: './action.html' },

    deps: ['breizbot.pager'],

    props: {
        steps: [],
        availableActions: []
    },

    /**
     * 
     * @param {Breizbot.Services.Pager.Interface} pager 
     */
    init: function (elt, pager) {

        console.log('actionCtrl props', this.props)
        const { steps, availableActions } = this.props

        const ctrl = $$.viewController(elt, {
            data: {
                steps,
                availableActions,
                showMenubar: function (scope) {
                    return scope.idx > 0
                },
                canMoveUp: function (scope) {
                    return scope.idx > 0
                },
                canMoveDown: function (scope) {
                    return scope.idx < this.steps.length - 1
                }
            },
            events: {
                onMoveUp: function () {
                    //console.log('onMoveUp')
                    const idx = $(this).closest('.stepItem').index()
                    ctrl.model.steps = getSteps()
                    const temp = ctrl.model.steps[idx]
                    ctrl.model.steps[idx] = ctrl.model.steps[idx - 1]
                    ctrl.model.steps[idx - 1] = temp
                    ctrl.update()
                },
                onMoveDown: function () {
                    //console.log('onMoveDown')
                    const idx = $(this).closest('.stepItem').index()
                    ctrl.model.steps = getSteps()
                    const temp = ctrl.model.steps[idx]
                    ctrl.model.steps[idx] = ctrl.model.steps[idx + 1]
                    ctrl.model.steps[idx + 1] = temp
                    ctrl.update()
                },
                onRemoveStep: function () {
                    const idx = $(this).closest('.stepItem').index()
                    console.log('onRemoveStep', idx)
                    ctrl.model.steps.splice(idx, 1)
                    ctrl.update()
                }
            }
        })

        function getSteps() {
            const steps = []
            elt.find('form').each(function () {
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
                    onClick: function () {
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
                        let isOk = true
                        elt.find('form').each(function () {
                            /**@type {HTMLFormElement} */
                            const form = $(this).get(0)
                            //console.log('isOk', form.checkValidity())
                            isOk = isOk && form.reportValidity()
                        })
                        if (isOk) {
                            pager.popPage(getSteps())
                        }
                        
                    }
                }

            }
        }
    }
})