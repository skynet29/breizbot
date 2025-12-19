//@ts-check
$$.control.registerControl('infoPage', {

    template: "<div class=\"details\">\n\n    <strong>Title: </strong> <span bn-text=\"title\"></span>\n    <strong>Length: </strong><span bn-text=\"duration\"></span>\n\n</div>\n\n<div class=\"wrapper\">\n    <div class=\"video\" bn-style=\"{padding-bottom: ratio}\">\n        <iframe bn-attr=\"{src: videoUrl, width, height}\" frameborder=\"0\" allowfullscreen></iframe>\n\n    </div>\n</div>\n\n\n<div class=\"description\"> \n    <strong>Description:</strong>\n</div>\n\n<div class=\"scrollPanel\">\n    <div bn-text=\"description\"></div>\n</div>",

    deps: ['app.ytdl', 'breizbot.broker'],

    props: {
        info: null,
        videoUrl: '',
        videoId: ''
    },

    /**
     * 
     * @param {AppYoutube.Services.Interface} ytdl 
     * @param {Breizbot.Services.Broker.Interface} broker 
     */
    init: function (elt, ytdl, broker) {

        /**@type AppYoutube.Controls.InfoPage.Props */
        const props = this.props

        const progressDlg = $$.ui.progressDialog('Downloading...')
        const { videoUrl, videoId } = props

        const { title, thumbnail, description, length_seconds, videoFormat, audioFormat } = props.info

        const { width, height } = thumbnail
        const ctrl = $$.viewController(elt, {
            data: {
                duration: new Date(length_seconds * 1000).toLocaleTimeString('fr-FR', { timeZone: 'UTC' }),
                title,
                width,
                height,
                ratio: function () {
                    const ret = `${(height / width) * 100}%`
                    console.log('ratio', ret)
                    return ret
                },
                videoUrl: $$.url.getUrlParams(`https://www.youtube-nocookie.com/embed/${videoId}`, {
                    rel: 0,
                    modestbranding: 1,
                    showinfo: 0
                }),
                description
            },
            events: {

            }
        })

        broker.onTopic('breizbot.ytdl.progress', async (msg) => {
            if (msg.hist == true) {
                return
            }
            //console.log('progress', msg.data)
            const { percent, error, finish } = msg.data
            if (error) {
                progressDlg.hide()
                $$.ui.showAlert({ title: 'Error', content: error })
            }
            else if (finish == true) {
                await $$.util.wait(1000)
                progressDlg.hide()
            }
            else {
                progressDlg.setPercentage(percent / 100)
            }
        })

        this.getButtons = function () {

            return {
                download: {
                    title: 'Download',
                    icon: 'fa fa-download',
                    onClick: function (cmd) {
                        console.log('onDownload', videoUrl)
                        $$.ui.showForm({
                            title: 'Choose Format',
                            fields: {
                                video: {
                                    input: 'select',
                                    label: 'Video',
                                    value: videoFormat[0].url,
                                    items: videoFormat.map(v => {
                                        return { label: v.label, value: v.url }
                                    })
                                },
                                audio: {
                                    input: 'select',
                                    label: 'Audio',
                                    value: audioFormat[0].url,
                                    items: audioFormat.map(v => {
                                        return { label: v.label, value: v.url }
                                    })
                                }
                            }
                        },
                            (data) => {
                                console.log({ data })
                                const fileName = title + '.mp4'
                                ytdl.download(data.video, data.audio, fileName)
                                progressDlg.show()
                            }
                        )


                    }
                }
            }
        }
    }
});

//@ts-check
$$.control.registerControl('rootPage', {

	template: "<div bn-control=\"breizbot.searchbar\" \n	bn-bind=\"searchbar\"\n	bn-event=\"searchbarsubmit: onStart\"\n	data-placeholder=\"Search or paste video link url here\"></div>\n\n<div bn-show=\"waiting\" class=\"waiting\">\n	<span><i class=\"fa fa-spinner fa-pulse\"></i>&nbsp;Searching...</span>\n</div>\n	\n<div class=\"results w3-light-grey\" bn-show=\"!waiting\">\n	<div bn-each=\"results\" bn-event=\"click.item: onItemInfo\">\n		<div class=\"item w3-card-2 w3-hover-shadow\">\n			<div class=\"imgWrapper\">\n				<img bn-attr=\"{src: $scope.$i.thumbnail}\">\n			</div>\n\n			<div class=\"info\">\n				<div bn-html=\"$scope.$i.title\" ></div>\n				<div>\n					<i class=\"far fa-clock\"></i>\n					<span bn-text=\"getDate\"></span>\n				</div>\n			</div>\n		</div>\n	</div>\n</div>",

	deps: ['app.ytdl', 'breizbot.params', 'breizbot.pager'],

	/**
	 * 
	 * @param {AppYoutube.Services.Interface} ytdl 
	 * @param {*} params 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, ytdl, params, pager) {

		const url1 = 'https://www.youtube.com/watch?v='
		const url2 = 'https://youtu.be/'

		const ctrl = $$.viewController(elt, {
			data: {
				results: [],
				waiting: false,
				getDate: function (scope) {
					return new Date(scope.$i.date * 1000).toLocaleDateString('fr-FR')
				}
			},
			events: {
				onStart: function (ev, data) {
					const url = data.value
					if (url.startsWith(url1) || url.startsWith(url2)) {
						showInfo(url)
					}
					else {
						searchInfo(url)
					}
				},
				onItemInfo: function (ev) {
					const idx = $(this).index()
					const videoId = ctrl.model.results[idx].id
					//console.log('onItemInfo', videoId)
					showInfo(url2 + videoId)
				}

			}
		})

		/**
		 * 
		 * @param {string} videoUrl 
		 */
		async function showInfo(videoUrl) {
			//console.log('showInfo', videoUrl)
			let videoId
			if (videoUrl.startsWith(url1)) {
				videoId = videoUrl.replace(url1, '')
			}
			else {
				videoId = videoUrl.replace(url2, '')
			}
			//console.log('videoId', videoId)
			const info = await ytdl.info(videoId)
			console.log('info', info)
			pager.pushPage('infoPage', {
				title: info.title,
				/**@type AppYoutube.Controls.InfoPage.Props */
				props: {
					info,
					videoUrl,
					videoId
				}
			})

		}

		/**
		 * 
		 * @param {string} query 
		 */
		async function searchInfo(query) {
			//console.log('searchInfo', query)
			ctrl.setData({ waiting: true })
			const results = await ytdl.search(query, 20)
			console.log('results', results)
			if (typeof results == 'string') {
				$$.ui.showAlert({ title: 'Error', content: results })
			}
			else {
				ctrl.setData({ results, waiting: false })
			}
		}

		if (params.url != undefined) {
			ctrl.scope.searchbar.setValue(params.url)
			showInfo(params.url)
		}

	}


});





//@ts-check
$$.service.registerService('app.ytdl', {

	deps: ['breizbot.http', 'breizbot.broker'],

	/**
	 * 
	 * @param {Breizbot.Services.Http.Interface} http 
	 * @param {Breizbot.Services.Broker.Interface} broker 
	 * @returns 
	 */
	init: function(config, http, broker) {

		let srcId

		broker.on('ready', (msg) => { srcId = msg.clientId})

		return {
			info: function(videoId) {
				return http.get(`/info`, {videoId})
			},

			download: function(videoUrl, audioUrl, fileName) {
				return http.post(`/download`, {videoUrl, audioUrl, fileName, srcId})
			},

			search: function(query, maxResults = 3)	{
				return http.post(`/search`, {query, maxResults})
			}		
		}
	}

});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZm8uanMiLCJtYWluLmpzIiwic2VydmljZXMveXRkbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvL0B0cy1jaGVja1xuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2luZm9QYWdlJywge1xuXG4gICAgdGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwiZGV0YWlsc1xcXCI+XFxuXFxuICAgIDxzdHJvbmc+VGl0bGU6IDwvc3Ryb25nPiA8c3BhbiBibi10ZXh0PVxcXCJ0aXRsZVxcXCI+PC9zcGFuPlxcbiAgICA8c3Ryb25nPkxlbmd0aDogPC9zdHJvbmc+PHNwYW4gYm4tdGV4dD1cXFwiZHVyYXRpb25cXFwiPjwvc3Bhbj5cXG5cXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJ3cmFwcGVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwidmlkZW9cXFwiIGJuLXN0eWxlPVxcXCJ7cGFkZGluZy1ib3R0b206IHJhdGlvfVxcXCI+XFxuICAgICAgICA8aWZyYW1lIGJuLWF0dHI9XFxcIntzcmM6IHZpZGVvVXJsLCB3aWR0aCwgaGVpZ2h0fVxcXCIgZnJhbWVib3JkZXI9XFxcIjBcXFwiIGFsbG93ZnVsbHNjcmVlbj48L2lmcmFtZT5cXG5cXG4gICAgPC9kaXY+XFxuPC9kaXY+XFxuXFxuXFxuPGRpdiBjbGFzcz1cXFwiZGVzY3JpcHRpb25cXFwiPiBcXG4gICAgPHN0cm9uZz5EZXNjcmlwdGlvbjo8L3N0cm9uZz5cXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCI+XFxuICAgIDxkaXYgYm4tdGV4dD1cXFwiZGVzY3JpcHRpb25cXFwiPjwvZGl2PlxcbjwvZGl2PlwiLFxuXG4gICAgZGVwczogWydhcHAueXRkbCcsICdicmVpemJvdC5icm9rZXInXSxcblxuICAgIHByb3BzOiB7XG4gICAgICAgIGluZm86IG51bGwsXG4gICAgICAgIHZpZGVvVXJsOiAnJyxcbiAgICAgICAgdmlkZW9JZDogJydcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtBcHBZb3V0dWJlLlNlcnZpY2VzLkludGVyZmFjZX0geXRkbCBcbiAgICAgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkJyb2tlci5JbnRlcmZhY2V9IGJyb2tlciBcbiAgICAgKi9cbiAgICBpbml0OiBmdW5jdGlvbiAoZWx0LCB5dGRsLCBicm9rZXIpIHtcblxuICAgICAgICAvKipAdHlwZSBBcHBZb3V0dWJlLkNvbnRyb2xzLkluZm9QYWdlLlByb3BzICovXG4gICAgICAgIGNvbnN0IHByb3BzID0gdGhpcy5wcm9wc1xuXG4gICAgICAgIGNvbnN0IHByb2dyZXNzRGxnID0gJCQudWkucHJvZ3Jlc3NEaWFsb2coJ0Rvd25sb2FkaW5nLi4uJylcbiAgICAgICAgY29uc3QgeyB2aWRlb1VybCwgdmlkZW9JZCB9ID0gcHJvcHNcblxuICAgICAgICBjb25zdCB7IHRpdGxlLCB0aHVtYm5haWwsIGRlc2NyaXB0aW9uLCBsZW5ndGhfc2Vjb25kcywgdmlkZW9Gb3JtYXQsIGF1ZGlvRm9ybWF0IH0gPSBwcm9wcy5pbmZvXG5cbiAgICAgICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSB0aHVtYm5haWxcbiAgICAgICAgY29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBuZXcgRGF0ZShsZW5ndGhfc2Vjb25kcyAqIDEwMDApLnRvTG9jYWxlVGltZVN0cmluZygnZnItRlInLCB7IHRpbWVab25lOiAnVVRDJyB9KSxcbiAgICAgICAgICAgICAgICB0aXRsZSxcbiAgICAgICAgICAgICAgICB3aWR0aCxcbiAgICAgICAgICAgICAgICBoZWlnaHQsXG4gICAgICAgICAgICAgICAgcmF0aW86IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmV0ID0gYCR7KGhlaWdodCAvIHdpZHRoKSAqIDEwMH0lYFxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncmF0aW8nLCByZXQpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHZpZGVvVXJsOiAkJC51cmwuZ2V0VXJsUGFyYW1zKGBodHRwczovL3d3dy55b3V0dWJlLW5vY29va2llLmNvbS9lbWJlZC8ke3ZpZGVvSWR9YCwge1xuICAgICAgICAgICAgICAgICAgICByZWw6IDAsXG4gICAgICAgICAgICAgICAgICAgIG1vZGVzdGJyYW5kaW5nOiAxLFxuICAgICAgICAgICAgICAgICAgICBzaG93aW5mbzogMFxuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXZlbnRzOiB7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICBicm9rZXIub25Ub3BpYygnYnJlaXpib3QueXRkbC5wcm9ncmVzcycsIGFzeW5jIChtc2cpID0+IHtcbiAgICAgICAgICAgIGlmIChtc2cuaGlzdCA9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdwcm9ncmVzcycsIG1zZy5kYXRhKVxuICAgICAgICAgICAgY29uc3QgeyBwZXJjZW50LCBlcnJvciwgZmluaXNoIH0gPSBtc2cuZGF0YVxuICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgcHJvZ3Jlc3NEbGcuaGlkZSgpXG4gICAgICAgICAgICAgICAgJCQudWkuc2hvd0FsZXJ0KHsgdGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6IGVycm9yIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChmaW5pc2ggPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGF3YWl0ICQkLnV0aWwud2FpdCgxMDAwKVxuICAgICAgICAgICAgICAgIHByb2dyZXNzRGxnLmhpZGUoKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcHJvZ3Jlc3NEbGcuc2V0UGVyY2VudGFnZShwZXJjZW50IC8gMTAwKVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIHRoaXMuZ2V0QnV0dG9ucyA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBkb3dubG9hZDoge1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0Rvd25sb2FkJyxcbiAgICAgICAgICAgICAgICAgICAgaWNvbjogJ2ZhIGZhLWRvd25sb2FkJyxcbiAgICAgICAgICAgICAgICAgICAgb25DbGljazogZnVuY3Rpb24gKGNtZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ29uRG93bmxvYWQnLCB2aWRlb1VybClcbiAgICAgICAgICAgICAgICAgICAgICAgICQkLnVpLnNob3dGb3JtKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0Nob29zZSBGb3JtYXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlbzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQ6ICdzZWxlY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICdWaWRlbycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmlkZW9Gb3JtYXRbMF0udXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHZpZGVvRm9ybWF0Lm1hcCh2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBsYWJlbDogdi5sYWJlbCwgdmFsdWU6IHYudXJsIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF1ZGlvOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dDogJ3NlbGVjdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogJ0F1ZGlvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBhdWRpb0Zvcm1hdFswXS51cmwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczogYXVkaW9Gb3JtYXQubWFwKHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IGxhYmVsOiB2LmxhYmVsLCB2YWx1ZTogdi51cmwgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBkYXRhIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gdGl0bGUgKyAnLm1wNCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeXRkbC5kb3dubG9hZChkYXRhLnZpZGVvLCBkYXRhLmF1ZGlvLCBmaWxlTmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3NEbGcuc2hvdygpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgKVxuXG5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLWNvbnRyb2w9XFxcImJyZWl6Ym90LnNlYXJjaGJhclxcXCIgXFxuXHRibi1iaW5kPVxcXCJzZWFyY2hiYXJcXFwiXFxuXHRibi1ldmVudD1cXFwic2VhcmNoYmFyc3VibWl0OiBvblN0YXJ0XFxcIlxcblx0ZGF0YS1wbGFjZWhvbGRlcj1cXFwiU2VhcmNoIG9yIHBhc3RlIHZpZGVvIGxpbmsgdXJsIGhlcmVcXFwiPjwvZGl2PlxcblxcbjxkaXYgYm4tc2hvdz1cXFwid2FpdGluZ1xcXCIgY2xhc3M9XFxcIndhaXRpbmdcXFwiPlxcblx0PHNwYW4+PGkgY2xhc3M9XFxcImZhIGZhLXNwaW5uZXIgZmEtcHVsc2VcXFwiPjwvaT4mbmJzcDtTZWFyY2hpbmcuLi48L3NwYW4+XFxuPC9kaXY+XFxuXHRcXG48ZGl2IGNsYXNzPVxcXCJyZXN1bHRzIHczLWxpZ2h0LWdyZXlcXFwiIGJuLXNob3c9XFxcIiF3YWl0aW5nXFxcIj5cXG5cdDxkaXYgYm4tZWFjaD1cXFwicmVzdWx0c1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLml0ZW06IG9uSXRlbUluZm9cXFwiPlxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJpdGVtIHczLWNhcmQtMiB3My1ob3Zlci1zaGFkb3dcXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcImltZ1dyYXBwZXJcXFwiPlxcblx0XHRcdFx0PGltZyBibi1hdHRyPVxcXCJ7c3JjOiAkc2NvcGUuJGkudGh1bWJuYWlsfVxcXCI+XFxuXHRcdFx0PC9kaXY+XFxuXFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwiaW5mb1xcXCI+XFxuXHRcdFx0XHQ8ZGl2IGJuLWh0bWw9XFxcIiRzY29wZS4kaS50aXRsZVxcXCIgPjwvZGl2Plxcblx0XHRcdFx0PGRpdj5cXG5cdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhciBmYS1jbG9ja1xcXCI+PC9pPlxcblx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXREYXRlXFxcIj48L3NwYW4+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG48L2Rpdj5cIixcblxuXHRkZXBzOiBbJ2FwcC55dGRsJywgJ2JyZWl6Ym90LnBhcmFtcycsICdicmVpemJvdC5wYWdlciddLFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtBcHBZb3V0dWJlLlNlcnZpY2VzLkludGVyZmFjZX0geXRkbCBcblx0ICogQHBhcmFtIHsqfSBwYXJhbXMgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHl0ZGwsIHBhcmFtcywgcGFnZXIpIHtcblxuXHRcdGNvbnN0IHVybDEgPSAnaHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g/dj0nXG5cdFx0Y29uc3QgdXJsMiA9ICdodHRwczovL3lvdXR1LmJlLydcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0cmVzdWx0czogW10sXG5cdFx0XHRcdHdhaXRpbmc6IGZhbHNlLFxuXHRcdFx0XHRnZXREYXRlOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gbmV3IERhdGUoc2NvcGUuJGkuZGF0ZSAqIDEwMDApLnRvTG9jYWxlRGF0ZVN0cmluZygnZnItRlInKVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uU3RhcnQ6IGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdGNvbnN0IHVybCA9IGRhdGEudmFsdWVcblx0XHRcdFx0XHRpZiAodXJsLnN0YXJ0c1dpdGgodXJsMSkgfHwgdXJsLnN0YXJ0c1dpdGgodXJsMikpIHtcblx0XHRcdFx0XHRcdHNob3dJbmZvKHVybClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRzZWFyY2hJbmZvKHVybClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSXRlbUluZm86IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnN0IHZpZGVvSWQgPSBjdHJsLm1vZGVsLnJlc3VsdHNbaWR4XS5pZFxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uSXRlbUluZm8nLCB2aWRlb0lkKVxuXHRcdFx0XHRcdHNob3dJbmZvKHVybDIgKyB2aWRlb0lkKVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IHZpZGVvVXJsIFxuXHRcdCAqL1xuXHRcdGFzeW5jIGZ1bmN0aW9uIHNob3dJbmZvKHZpZGVvVXJsKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdzaG93SW5mbycsIHZpZGVvVXJsKVxuXHRcdFx0bGV0IHZpZGVvSWRcblx0XHRcdGlmICh2aWRlb1VybC5zdGFydHNXaXRoKHVybDEpKSB7XG5cdFx0XHRcdHZpZGVvSWQgPSB2aWRlb1VybC5yZXBsYWNlKHVybDEsICcnKVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHZpZGVvSWQgPSB2aWRlb1VybC5yZXBsYWNlKHVybDIsICcnKVxuXHRcdFx0fVxuXHRcdFx0Ly9jb25zb2xlLmxvZygndmlkZW9JZCcsIHZpZGVvSWQpXG5cdFx0XHRjb25zdCBpbmZvID0gYXdhaXQgeXRkbC5pbmZvKHZpZGVvSWQpXG5cdFx0XHRjb25zb2xlLmxvZygnaW5mbycsIGluZm8pXG5cdFx0XHRwYWdlci5wdXNoUGFnZSgnaW5mb1BhZ2UnLCB7XG5cdFx0XHRcdHRpdGxlOiBpbmZvLnRpdGxlLFxuXHRcdFx0XHQvKipAdHlwZSBBcHBZb3V0dWJlLkNvbnRyb2xzLkluZm9QYWdlLlByb3BzICovXG5cdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0aW5mbyxcblx0XHRcdFx0XHR2aWRlb1VybCxcblx0XHRcdFx0XHR2aWRlb0lkXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gcXVlcnkgXG5cdFx0ICovXG5cdFx0YXN5bmMgZnVuY3Rpb24gc2VhcmNoSW5mbyhxdWVyeSkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnc2VhcmNoSW5mbycsIHF1ZXJ5KVxuXHRcdFx0Y3RybC5zZXREYXRhKHsgd2FpdGluZzogdHJ1ZSB9KVxuXHRcdFx0Y29uc3QgcmVzdWx0cyA9IGF3YWl0IHl0ZGwuc2VhcmNoKHF1ZXJ5LCAyMClcblx0XHRcdGNvbnNvbGUubG9nKCdyZXN1bHRzJywgcmVzdWx0cylcblx0XHRcdGlmICh0eXBlb2YgcmVzdWx0cyA9PSAnc3RyaW5nJykge1xuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoeyB0aXRsZTogJ0Vycm9yJywgY29udGVudDogcmVzdWx0cyB9KVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHJlc3VsdHMsIHdhaXRpbmc6IGZhbHNlIH0pXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHBhcmFtcy51cmwgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRjdHJsLnNjb3BlLnNlYXJjaGJhci5zZXRWYWx1ZShwYXJhbXMudXJsKVxuXHRcdFx0c2hvd0luZm8ocGFyYW1zLnVybClcblx0XHR9XG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2FwcC55dGRsJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QuaHR0cCcsICdicmVpemJvdC5icm9rZXInXSxcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuSHR0cC5JbnRlcmZhY2V9IGh0dHAgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuQnJva2VyLkludGVyZmFjZX0gYnJva2VyIFxuXHQgKiBAcmV0dXJucyBcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgaHR0cCwgYnJva2VyKSB7XG5cblx0XHRsZXQgc3JjSWRcblxuXHRcdGJyb2tlci5vbigncmVhZHknLCAobXNnKSA9PiB7IHNyY0lkID0gbXNnLmNsaWVudElkfSlcblxuXHRcdHJldHVybiB7XG5cdFx0XHRpbmZvOiBmdW5jdGlvbih2aWRlb0lkKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldChgL2luZm9gLCB7dmlkZW9JZH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRkb3dubG9hZDogZnVuY3Rpb24odmlkZW9VcmwsIGF1ZGlvVXJsLCBmaWxlTmFtZSkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvZG93bmxvYWRgLCB7dmlkZW9VcmwsIGF1ZGlvVXJsLCBmaWxlTmFtZSwgc3JjSWR9KVxuXHRcdFx0fSxcblxuXHRcdFx0c2VhcmNoOiBmdW5jdGlvbihxdWVyeSwgbWF4UmVzdWx0cyA9IDMpXHR7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9zZWFyY2hgLCB7cXVlcnksIG1heFJlc3VsdHN9KVxuXHRcdFx0fVx0XHRcblx0XHR9XG5cdH1cblxufSk7XG4iXX0=
