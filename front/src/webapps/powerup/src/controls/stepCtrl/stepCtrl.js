// @ts-check

$$.control.registerControl('stepCtrl', {

	template: { gulp_inject: './stepCtrl.html' },

	deps: ['breizbot.pager'],

	props: {
		data: null
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, pager) {
	
        //console.log('stepCtrl props', this.props)
        let { data } = this.props

        data = data || {}

        const actionTypes = ['SPEED', 'POWER', 'DBLSPEED', 'ROTATE', 'POSITION', 'CALIBRATE', 'ZERO']
        const ports = 'ABCD'.split('')
        const hubs = ['HUB1', 'HUB2']

        const ctrl = $$.viewController(elt, {
            data: {
                type: data.type || 'SPEED',
                hub: data.hub || 'HUB1',
                actionTypes,
                ports,
                hubs,
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
                },
                isRotate: function () {
                    return this.isType('ROTATE')
                },
                isPosition: function () {
                    return this.isType('POSITION')
                },
                isCalibrate: function () {
                    return this.isType('CALIBRATE')
                },
				isZero: function () {
                    return this.isType('ZERO')
                }
            },
            events: {

            }
        })

        elt.setFormData(data)

    }

});




