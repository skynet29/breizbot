$$.control.registerControl('editDlg', {

    template: {gulp_inject: './editDlg.html'},

    deps: ['breizbot.http', 'breizbot.pager'],

    props: {
        mp3: {},
        fileName: ''
    },

    init: function(elt, http, pager) {

        const {mp3, fileName} = this.props

        const ctrl = $$.viewController(elt, {
            data: {
                mp3
            },
            events: {
                onFindInfo: async function() {
					const data = await http.post('/search', {
						query: fileName.replace('.mp3', ''),
					})
                    console.log(data)
                    if (data && data.title) {
                        ctrl.model.mp3.title = data.title
                        ctrl.model.mp3.artist = data.artist
                        ctrl.update()
                    }
                    else {
                        $$.ui.showAlert({title: 'MP3 Information', content: 'No information found !'})
                    }                    
                },
                onSubmit: function(ev) {
                    ev.preventDefault()
                    const data = $(this).getFormData()

                    pager.popPage(data)

                }
            }
        })

        this.getButtons = function() {
            return {
                ok: {
                    title: 'Apply',
                    icon: 'fa fa-check',
                    onClick: function() {
                        ctrl.scope.submit.click()
                    }
                }
            }
        }
    }
})