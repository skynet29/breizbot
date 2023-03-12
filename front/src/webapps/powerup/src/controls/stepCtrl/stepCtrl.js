// @ts-check

$$.control.registerControl('stepCtrl', {

    template: { gulp_inject: './stepCtrl.html' },

    deps: ['breizbot.pager', 'hub'],

    props: {
        data: null
    },

    /**
     * 
     * @param {Breizbot.Services.Pager.Interface} pager 
     * @param {HUB} hub
     */
    init: function (elt, pager, hub) {

        //console.log('stepCtrl props', this.props)
        let { data } = this.props

        data = data || {}

        const actionTypes = [
            'SLEEP',
            'POWER',
            'SPEED',
            'DBLSPEED',
            'SPEEDTIME',
            'DBLSPEEDTIME',
            'ROTATE',
            'DBLROTATE',
            'POSITION',
            'DBLPOSITION',
            'CALIBRATE',
            'ZERO',
            'COLOR',
            'RGB'
        ]
        const ports = 'ABCD'.split('')
        const hubs = ['HUB1', 'HUB2']
        const ledColors = Object.entries(hub.Color).map(([label, value]) => Object.assign({label, value}))
        //console.log(ledColors)

        const brakeStyles = Object.entries(hub.BrakingStyle).map(([label, value]) => Object.assign({label, value}))
        //console.log(brakeStyles)

        const dataInfo = {
            port: data.port || 'A',
            port1: data.port1 || 'A',
            port2: data.port2 || 'B',
            type: data.type || 'SPEED',
            hub: data.hub || 'HUB1',
            brakeStyle: data.brakeStyle || hub.BrakingStyle.BRAKE,
            actionTypes,
            brakeStyles,
            ledColors,
            ports,
            hubs
        }
        for(const a of actionTypes) {
            const name = a.charAt(0) + a.slice(1).toLowerCase()
            dataInfo['is' + name] = function() {
                return this.type == a
            }
        }
        const ctrl = $$.viewController(elt, {
            data: dataInfo,
            events: {
                onSubmit: function(ev) {
                    console.log('onSubmit')
                    ev.preventDefault()
                }
            }
        })

        elt.setFormData(data)

    }

});




