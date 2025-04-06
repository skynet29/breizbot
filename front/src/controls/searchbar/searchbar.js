$$.control.registerControl('breizbot.searchbar', {

    template: { gulp_inject: './searchbar.html' },

    props: {
        placeholder: '',
        minlength: 0,
        required: true
    },

    init: function (elt) {

        const { placeholder, minlength, required } = this.props

        const ctrl = $$.viewController(elt, {
            data: {
                placeholder,
                minlength,
                required
            },
            events: {
                onSearch: async function (ev) {
                    ev.preventDefault()
                    const { value } = $(this).getFormData()
                    elt.trigger('searchbarsubmit', { value })
                }

            }
        })

        this.setValue = function (value) {
            ctrl.scope.form.setFormData({ value })
        }
    }

}); 11
