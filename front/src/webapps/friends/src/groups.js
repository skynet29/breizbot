$$.control.registerControl('groups', {

    template: { gulp_inject: './groups.html' },

    deps: ['breizbot.users', 'breizbot.friends', 'breizbot.pager'],

    props: {
        friendUserName: ''
    },

    init: function (elt, users, friendsSrv, pager) {

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
            const groups = await users.getSharingGroups()
            //console.log('groups', groups)
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
                addGroup: {
                    title: 'Add Group',
                    icon: 'fa fa-user-plus',
                    onClick: async function () {
                        const groupName = await $$.ui.showPrompt({ title: "Add Group", label: 'Name' })
                        //console.log('groupName', groupName)
                        if (groupName != null) {
                            await users.addSharingGroup(groupName)
                            getGroups()
                        }


                    }
                },
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