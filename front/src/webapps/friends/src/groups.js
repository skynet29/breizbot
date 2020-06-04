$$.control.registerControl('groups', {

    template: { gulp_inject: './groups.html' },

    deps: ['breizbot.users', 'breizbot.pager'],

    props: {
        friendUserName: ''
    },

    init: function (elt, users, pager) {

        const { friendUserName } = this.props

        const ctrl = $$.viewController(elt, {
            data: {
                groups: [],
                selectedGroups: [],
                noGroups: function() {
                    return this.groups.length == 0
                }
            },
            events: {
                onAddGroup: async function() {
                    const groupName = await $$.ui.showPrompt({ title: "Add Group", label: 'Name' })
                    console.log('groupName', groupName)
                    if (groupName != null) {
                        await users.addSharingGroup(groupName)
                        getGroups()    
                    }

                }
            }
        })

        async function getGroups() {
            const groups = await users.getSharingGroups()
            console.log('groups', groups)
            const selectedGroups = await users.getFriendGroups(friendUserName)
            console.log('selectedGroups', selectedGroups)
            ctrl.setData({ groups, selectedGroups })
        }

        getGroups()

        this.getButtons = function () {
            return {
                add: {
                    title: 'Add Group',
                    icon: 'fa fa-check',
                    onClick: async function () {
                        const {selectedGroups} = ctrl.model
                        console.log('selectedGroups', selectedGroups)
                        await users.setFriendGroups(friendUserName, selectedGroups)
                        pager.popPage()
                    }
                }
            }
        }
    }
})