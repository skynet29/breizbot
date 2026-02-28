// @ts-check

$$.control.registerControl('addAction', {

    template: { gulp_inject: './addAction.html' },

    deps: ['breizbot.pager'],

    props: {
        hubDevices: []
    },

    /**
     * 
     * @param {Breizbot.Services.Pager.Interface} pager 
     */
    init: function (elt, pager) {


        //console.log('props', this.props)
        /**@type {Array<HUB.HubDevice>} */

        const hubDevices = this.props.hubDevices

        /**@type HUB.HubDevice */
        let selectedHub = null

        const ctrl = $$.viewController(elt, {
            data: {
                hubs: hubDevices.map(h => h.name),
                devices: [],
                actions: [],
                hasDevice: function() {
                    return this.devices.length > 0
                },
                hasActions: function() {
                    return this.actions.length > 0
                }
            },
            events: {
                onSubmit: function (ev) {
                    ev.preventDefault()
                    pager.popPage($(this).getFormData())

                },
                onHubChange: function (ev) {
                    console.log('onHubChange')
                    const hubName = $(this).getValue()

                    selectedHub = hubDevices.find(h => h.name == hubName)
                    const devices = selectedHub.getHubDevices()
                    ctrl.model.devices = devices.filter(d => d.portId < 50).map(d => ({ label: d.name, value: d.portId }))
                    ctrl.model.actions = []
                    ctrl.update()
                    elt.find('.port').get(0).selectedIndex = -1
                },
                onPortChange: function () {
                    const portId = $(this).getValue()

                    const device = selectedHub.getDevice(portId)
                    ctrl.model.actions = device.availableActions

                    ctrl.update()
                    elt.find('.action').get(0).selectedIndex = -1

                }
            }
        })

        elt.find('.hub').get(0).selectedIndex = -1


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