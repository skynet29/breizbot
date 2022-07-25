// @ts-check

$$.control.registerControl('settings', {

    template: { gulp_inject: './settings.html' },

    deps: ['breizbot.pager'],

    props: {
        data: {}
    },

    /**
     * 
     * @param {Breizbot.Services.Pager.Interface} pager 
     */
    init: function (elt, pager) {

        const { data } = this.props

        const ctrl = $$.viewController(elt, {
            data: {
                data
            },
            events: {
                onChooseFolder: function() {
                    pager.pushPage('breizbot.files', {
                        title: 'Choose Folder',
                        props: {
                            filterExtension: 'mp3'
                        },
                        onReturn: function(folderPath) {
                            console.log('onReturn', folderPath)
                            ctrl.model.data.samplersFolder = folderPath
                            ctrl.update()
                        },
                        buttons: {
                            apply: {
                                icon: 'fas fa-check',
                                title: 'Apply',
                                onClick: function() {
                                    console.log('onClick', this)
                                    pager.popPage(this.getRootDir())
                                }
                            }
                        }
                    })
                },
                onSubmit: function (ev) {
                    ev.preventDefault()
                    pager.popPage($(this).getFormData())

                }
            }
        })

        this.getButtons = function () {
            return {
                apply: {
                    title: 'Apply',
                    icon: 'fas fa-check',
                    onClick: function () {
                        ctrl.scope.submit.click()
                    }
                }
            }
        }
    }
})