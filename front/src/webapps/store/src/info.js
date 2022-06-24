//@ts-check
$$.control.registerControl('infoPage', {

    template: { gulp_inject: './info.html' },

    deps: ['breizbot.users', 'breizbot.scheduler'],

    props: {
        info: {}
    },

    /**
     * 
     * @param {Breizbot.Services.User.Interface} users 
     * @param {Breizbot.Services.Scheduler.Interface} scheduler 
     */
    init: function (elt, users, scheduler) {

        const { info } = this.props

        const { appName, props, activated } = info
        let { description, title, iconCls, colorCls, iconUrl } = props

        description = description || "No description"
        description = description.split(';').join('<br>')


        const ctrl = $$.viewController(elt, {
            data: {
                description,
                title,
                iconCls,
                iconUrl,
                activated,
                getColorClass: function () {
                    return `tile w3-round-large ${colorCls}`
                },
                getIconUrl: function () {
                    return `/webapps/${appName}/assets/${iconUrl}`
                }
            },
            events: {
                onLaunch: function () {
                    scheduler.openApp(appName)
                },
                onAddToHome: async function () {
                    await users.activateApp(appName, true)
                    ctrl.setData({activated: true})
                },
            }
        })

    }
});