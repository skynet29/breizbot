$$.control.registerControl('breizbot.searchbar', {

    template: {gulp_inject: './searchbar.html'},

    props: {
        placeholder: ''
    },

    init: function(elt) {

        const {placeholder} = this.props

        const ctrl = $$.viewController(elt, {
            data: {
                placeholder
            },
            events: {
                onSearch: async function(ev) {					
					ev.preventDefault()
                    const {value} = $(this).getFormData()
                    elt.trigger('searchbarsubmit', {value})
                }

            }
        })

        this.setValue = function(value) {
            ctrl.scope.form.setFormData({value})
        }
    },
    $iface: `
        setValue(value: string)
    `,
    $events: 'searchbarsubmit'
});11
