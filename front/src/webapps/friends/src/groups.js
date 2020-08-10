$$.control.registerControl('groups', {

    template: { gulp_inject: './groups.html' },

    deps: ['breizbot.friends', 'breizbot.pager', 'breizbot.files'],

    props: {
        friendUserName: ''
    },

    init: function (elt, friendsSrv, pager, filesSrv) {

        const { friendUserName } = this.props

        const ctrl = $$.viewController(elt, {
            data: {
                groups: [],
                positionAuth: false,
                selectedGroups: [],
                noGroups: function () {
                    return this.groups.length == 0
                }
            }
        })

        async function getGroups() {
            let groups = await filesSrv.list('/share', {folderOnly: true})
            groups = groups.map((f) => f.name)
            console.log('groups', groups)
            const info = await friendsSrv.getFriendInfo(friendUserName)
            //console.log('friendInfo', info)
            const selectedGroups = info.groups
            const { positionAuth } = info
            ctrl.setData({ groups, selectedGroups: [], positionAuth })
            ctrl.setData({ selectedGroups })
        }

        getGroups()

        this.getButtons = function () {
            return {
                apply: {
                    title: 'Apply',
                    icon: 'fa fa-check',
                    onClick: async function () {
                        const { selectedGroups, positionAuth } = ctrl.model
                        //console.log('selectedGroups', selectedGroups)
                        await friendsSrv.setFriendInfo(friendUserName, selectedGroups, positionAuth)
                        pager.popPage()
                    }
                }
            }
        }
    }
})