$$.control.registerControl('editDlg', {

    template: {gulp_inject: './editDlg.html'},

    deps: ['breizbot.http', 'breizbot.pager'],

    props: {
        data: {},
        fileName: ''
    },

    init: function(elt, http, pager) {

        const {data, fileName} = this.props

        const ctrl = $$.viewController(elt, {
            data: {
               title: data.title,
               artist: data.artist 
            },
            events: {
                onFindInfo: async function() {
					const data = await http.post('/search', {
						query: fileName.replace('.mp3', ''),
					})
                    console.log(data)
                    if (data && data.title) {
                        ctrl.setData({
                            title: data.title,
                            artist: data.artist 
                        })
                    }
                    else {
                        $$.ui.showAlert({title: 'MP3 Information', content: 'No information found !'})
                    }                    
                },
                onSubmit: function(ev) {
                    ev.preventDefault()

                    const {title, artist} = ctrl.model
                    pager.popPage({title, artist})

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