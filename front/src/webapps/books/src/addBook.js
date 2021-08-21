// @ts-check
$$.control.registerControl('addBook', {

    template: { gulp_inject: './addBook.html' },

    deps: ['breizbot.pager', 'breizbot.http', 'breizbot.files'],

    props: {
        data: {},
    },

    /**
     * 
     * @param {Breizbot.Services.Pager.Interface} pager 
     * @param {Breizbot.Services.Http.Interface} http 
     * @param {Breizbot.Services.Files.Interface} srvFile 
     */
    init: function (elt, pager, http, srvFile) {

        //@ts-ignore
        const { data } = this.props

        console.log('data', data)

        const ctrl = $$.viewController(elt, {
            data: {
                authors: [],
                series: [],
                data,
                getCoverUrl: function () {
                    return (this.data.cover) ? srvFile.fileAppThumbnailUrl(this.data.cover, '100x?') : '#'
                }
            },
            events: {
                onSubmit: function (ev) {
                    ev.preventDefault()
                    pager.popPage($(this).getFormData())

                },

                onAuthorChange: async function (ev, ui) {
                    console.log('onAuthorChange', ui.item.value)
                    await getSeries(ui.item.value)
                },

                onDownloadCover: function () {
                    $$.ui.openFileDialog(async (file) => {
                        console.log('file', file)
                        const ext = file.name.split('.').pop()
                        const fileName = `Cover${Date.now()}.${ext}`
                        console.log('fileName', fileName)
                        await srvFile.saveFile(file, fileName)
                        ctrl.model.data.cover = fileName
                        ctrl.update()

                    }, false)
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

        async function getAuthors() {
            const authors = await http.get('/authors')
            console.log('authors', authors)
            ctrl.setData({ authors })
        }

        async function getSeries(author) {
            const series = await http.post('/series', { author })
            console.log('series', series)
            ctrl.setData({ series })

        }

        getAuthors()
    }
})