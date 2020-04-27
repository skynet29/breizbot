$$.control.registerControl('infoPage', {

    template: {gulp_inject: './info.html'},

    props: {
        info: {}
    },

    init: function(elt) {

        let {info} = this.props

        let {description, title, iconCls, colorCls} = info.props

        description = description || "No description"
        description = description.split(';').join('<br>')


        const ctrl = $$.viewController(elt, {
            data: {
                btnText: function() {
                    return (info.activated) ? 'Remove from Home page' : 'Add to Home page'
                },
                description,
                title,
                iconCls,
                getColorClass: function() {
                    return `tile w3-round-large ${colorCls}`
                }
            }
        })

    }
});