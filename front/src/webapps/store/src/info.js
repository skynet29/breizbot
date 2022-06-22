//@ts-check
$$.control.registerControl('infoPage', {

    template: {gulp_inject: './info.html'},

    props: {
        info: {}
    },

    init: function(elt) {

        const {info} = this.props

        const {appName, props} = info
        let {description, title, iconCls, colorCls, iconUrl} = props

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
                iconUrl,
                getColorClass: function() {
                    return `tile w3-round-large ${colorCls}`
                },
                getIconUrl: function() {
                    return `/webapps/${appName}/assets/${iconUrl}`
                }
            }
        })

    }
});