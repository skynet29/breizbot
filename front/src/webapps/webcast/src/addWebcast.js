$$.control.registerControl('addWebcast', {

    template: { gulp_inject: './addWebcast.html' },

    deps: ['breizbot.pager'],

    props: {
        data: null
    },

    init: function (elt, pager) {

        const {data} = this.props

        const ctrl = $$.viewController(elt, {
            data: {
                users: (data != null) ? data.users : [],
                data

            },
            events: {
                onSubmit: function (ev) {
                    ev.preventDefault()
                    const data = $(this).getFormData()
                    data.users = ctrl.model.users
                    pager.popPage(data)
                },
                onRemoveUser: function() {
                    const idx = $(this).closest('li').index()
                    console.log('onRemoveUser', idx)
                    ctrl.model.users.splice(idx, 1)
                    ctrl.update()
                }
            }

        })

        this.getButtons = function () {
            return {
                addUser: {
                    icon: 'fa fa-user-plus',
                    title: 'Add User',
                    onClick: function () {
                        pager.pushPage('breizbot.friends', {
                            title: 'Add User',
                            props: {
                                showConnectionState: false,
                                showSelection: true
                            },
                            buttons: {
                                add: {
                                    title: 'Add',
                                    icon: 'fa fa-plus',
                                    onClick: function() {
                                        pager.popPage(this.getSelection())
                                    }
                                }
                            },
                            onReturn: function(data) {
                                console.log('onReturn', data)
                                ctrl.model.users.push(data.friendUserName)
                                ctrl.update()
                            }
                        })
                    }
                },
                apply: {
                    icon: 'fa fa-check',
                    title: 'Apply',
                    onClick: function () {
                        ctrl.scope.submit.click()
                    }
                }
            }


        }
    }
})