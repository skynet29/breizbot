$$.control.registerControl('addWebcast', {

    template: "<div>\n    <form bn-event=\"submit: onSubmit\">\n\n        <div bn-control=\"brainjs.inputgroup\">\n            <label>Name</label>\n            <input type=\"text\" required>\n        </div>\n\n        <input type=\"submit\" hidden bn-bind=\"submit\">\n    </form>\n</div>\n\n<div class=\"users\">\n    <ul class=\"w3-ul w3-border w3-white\" bn-each=\"users\" \n	bn-event=\"click.delete: onRemoveUser\">\n    \n    <li class=\"w3-bar\">\n		\n		<span class=\"w3-button w3-right delete w3-blue\" title=\"Delete\" bn-icon=\"fa fa-trash\"></span>\n\n		<div class=\"w3-bar-item\">\n			<i class=\"fa fa-user\"></i>\n			<span bn-text=\"$scope.$i\"></span>\n		</div>\n	</li>\n</ul>\n</div>\n",

    deps: ['breizbot.pager'],

    init: function (elt, pager) {

        const ctrl = $$.viewController(elt, {
            data: {
                users: []
            },
            events: {
                onSubmit: function (ev) {
                    ev.preventDefault()
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
$$.control.registerControl('rootPage', {

	template: "<div class=\"toolbar\">\n    <button class=\"w3-button\" bn-icon=\"fa fa-plus\" bn-event=\"click: onAddWebcast\"></button>\n</div>\n<div>\n    <div bn-control=\"brainjs.radiogroup\" bn-val=\"type\" bn-update=\"change\">\n        <input type=\"radio\" value=\"server\">Server\n        <input type=\"radio\" value=\"client\">Client\n    </div>\n    <div>\n        <button bn-event=\"click: onConnect\" class=\"w3-btn w3-blue\" bn-show=\"!isConnected\">Connect</button>\n        <button bn-event=\"click: onStart\" class=\"w3-btn w3-blue\" bn-show=\"showStart\">Start</button>\n        <button bn-event=\"click: onStop\" class=\"w3-btn w3-blue\" bn-show=\"showStop\">Stop</button>\n    </div>\n</div>\n\n<div class=\"content\">\n    <video bn-bind=\"video\" autoplay bn-prop=\"{muted: isMuted}\"></video>\n</div>",

	deps: ['breizbot.pager'],

	init: function (elt, pager) {

		let sock = null

		const constraints = { video: true, audio: true }
		const mimeType = 'video/webm; codecs=opus, vp8'


		let mediaRecorder = null
		let mediaSource = null
		let sourceBuffer = null

		function connect() {

			console.log('try to connect...')

			const { type } = ctrl.model

			let { host, protocol } = location
			protocol = (protocol == 'http:') ? 'ws:' : 'wss:'


			const url = `${protocol}//${host}/stream/${type}/`
			console.log('url', url)

			sock = new WebSocket(url)
			sock.binaryType = 'arraybuffer'

			sock.onopen = () => {
				console.log("Connected to streamer")
				ctrl.setData({ isConnected: true, isStarted: false })

			}


			sock.onmessage = (ev) => {
				//console.log('onmessage', ev.data)
				sourceBuffer.appendBuffer(ev.data)
			}

			sock.onclose = (ev) => {
				ctrl.setData({ isConnected: false })
			}

		}

		const ctrl = $$.viewController(elt, {
			data: {
				type: 'server',
				isConnected: false,
				isStarted: false,
				showStart: function () {
					return this.isConnected && this.type == 'server' && !this.isStarted
				},
				showStop: function () {
					return this.isConnected && this.type == 'server' && this.isStarted
				},
				isMuted: function () {
					return this.type == 'server'
				}
			},
			events: {
				onAddWebcast: function() {
					console.log('onAddWebcast')
					pager.pushPage('addWebcast', {
						title: 'Add Webcast'
					})

				},
				onConnect: function () {
					connect()
					if (ctrl.model.type == 'client') {
						mediaSource = new MediaSource()
						const video = ctrl.scope.video.get(0)
						video.src = URL.createObjectURL(mediaSource)
						mediaSource.addEventListener('sourceopen', () => {
							console.log('source opened')
							URL.revokeObjectURL(video.src)
							sourceBuffer = mediaSource.addSourceBuffer(mimeType)

						})
					}
				},

				onStart: async function () {
					console.log('onStart')
					try {
						const stream = await navigator.mediaDevices.getUserMedia(constraints)
						const video = ctrl.scope.video.get(0)
						video.srcObject = stream
						video.load()

						mediaRecorder = new MediaRecorder(stream, { type: mimeType })
						mediaRecorder.ondataavailable = async function (ev) {
							//console.log('ondataavailable', ev.data)
							const buffer = await ev.data.arrayBuffer()
							sock.send(buffer)
						}

						mediaRecorder.start(500)
						ctrl.setData({ isStarted: true })
					}
					catch (e) {
						console.error(e)
					}
				},

				onStop: function () {
					console.log('onStop')
					mediaRecorder.stop()
					ctrl.setData({ isStarted: false })
				}
			}
		})

	}


});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkZFdlYmNhc3QuanMiLCJtYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2FkZFdlYmNhc3QnLCB7XG5cbiAgICB0ZW1wbGF0ZTogXCI8ZGl2PlxcbiAgICA8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblN1Ym1pdFxcXCI+XFxuXFxuICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPk5hbWU8L2xhYmVsPlxcbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiByZXF1aXJlZD5cXG4gICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgPGlucHV0IHR5cGU9XFxcInN1Ym1pdFxcXCIgaGlkZGVuIGJuLWJpbmQ9XFxcInN1Ym1pdFxcXCI+XFxuICAgIDwvZm9ybT5cXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJ1c2Vyc1xcXCI+XFxuICAgIDx1bCBjbGFzcz1cXFwidzMtdWwgdzMtYm9yZGVyIHczLXdoaXRlXFxcIiBibi1lYWNoPVxcXCJ1c2Vyc1xcXCIgXFxuXHRibi1ldmVudD1cXFwiY2xpY2suZGVsZXRlOiBvblJlbW92ZVVzZXJcXFwiPlxcbiAgICBcXG4gICAgPGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiPlxcblx0XHRcXG5cdFx0PHNwYW4gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1yaWdodCBkZWxldGUgdzMtYmx1ZVxcXCIgdGl0bGU9XFxcIkRlbGV0ZVxcXCIgYm4taWNvbj1cXFwiZmEgZmEtdHJhc2hcXFwiPjwvc3Bhbj5cXG5cXG5cdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS11c2VyXFxcIj48L2k+XFxuXHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpXFxcIj48L3NwYW4+XFxuXHRcdDwvZGl2Plxcblx0PC9saT5cXG48L3VsPlxcbjwvZGl2PlxcblwiLFxuXG4gICAgZGVwczogWydicmVpemJvdC5wYWdlciddLFxuXG4gICAgaW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIpIHtcblxuICAgICAgICBjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgdXNlcnM6IFtdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXZlbnRzOiB7XG4gICAgICAgICAgICAgICAgb25TdWJtaXQ6IGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvblJlbW92ZVVzZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuaW5kZXgoKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnb25SZW1vdmVVc2VyJywgaWR4KVxuICAgICAgICAgICAgICAgICAgICBjdHJsLm1vZGVsLnVzZXJzLnNwbGljZShpZHgsIDEpXG4gICAgICAgICAgICAgICAgICAgIGN0cmwudXBkYXRlKClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSlcblxuICAgICAgICB0aGlzLmdldEJ1dHRvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGFkZFVzZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgaWNvbjogJ2ZhIGZhLXVzZXItcGx1cycsXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnQWRkIFVzZXInLFxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYWdlci5wdXNoUGFnZSgnYnJlaXpib3QuZnJpZW5kcycsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0FkZCBVc2VyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaG93Q29ubmVjdGlvblN0YXRlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2hvd1NlbGVjdGlvbjogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnV0dG9uczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnQWRkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGljb246ICdmYSBmYS1wbHVzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhZ2VyLnBvcFBhZ2UodGhpcy5nZXRTZWxlY3Rpb24oKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25SZXR1cm46IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ29uUmV0dXJuJywgZGF0YSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3RybC5tb2RlbC51c2Vycy5wdXNoKGRhdGEuZnJpZW5kVXNlck5hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN0cmwudXBkYXRlKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBhcHBseToge1xuICAgICAgICAgICAgICAgICAgICBpY29uOiAnZmEgZmEtY2hlY2snLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0FwcGx5JyxcbiAgICAgICAgICAgICAgICAgICAgb25DbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3RybC5zY29wZS5zdWJtaXQuY2xpY2soKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgfVxuICAgIH1cbn0pIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcbiAgICA8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIGJuLWljb249XFxcImZhIGZhLXBsdXNcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25BZGRXZWJjYXN0XFxcIj48L2J1dHRvbj5cXG48L2Rpdj5cXG48ZGl2PlxcbiAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMucmFkaW9ncm91cFxcXCIgYm4tdmFsPVxcXCJ0eXBlXFxcIiBibi11cGRhdGU9XFxcImNoYW5nZVxcXCI+XFxuICAgICAgICA8aW5wdXQgdHlwZT1cXFwicmFkaW9cXFwiIHZhbHVlPVxcXCJzZXJ2ZXJcXFwiPlNlcnZlclxcbiAgICAgICAgPGlucHV0IHR5cGU9XFxcInJhZGlvXFxcIiB2YWx1ZT1cXFwiY2xpZW50XFxcIj5DbGllbnRcXG4gICAgPC9kaXY+XFxuICAgIDxkaXY+XFxuICAgICAgICA8YnV0dG9uIGJuLWV2ZW50PVxcXCJjbGljazogb25Db25uZWN0XFxcIiBjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiIGJuLXNob3c9XFxcIiFpc0Nvbm5lY3RlZFxcXCI+Q29ubmVjdDwvYnV0dG9uPlxcbiAgICAgICAgPGJ1dHRvbiBibi1ldmVudD1cXFwiY2xpY2s6IG9uU3RhcnRcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCIgYm4tc2hvdz1cXFwic2hvd1N0YXJ0XFxcIj5TdGFydDwvYnV0dG9uPlxcbiAgICAgICAgPGJ1dHRvbiBibi1ldmVudD1cXFwiY2xpY2s6IG9uU3RvcFxcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiBibi1zaG93PVxcXCJzaG93U3RvcFxcXCI+U3RvcDwvYnV0dG9uPlxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJjb250ZW50XFxcIj5cXG4gICAgPHZpZGVvIGJuLWJpbmQ9XFxcInZpZGVvXFxcIiBhdXRvcGxheSBibi1wcm9wPVxcXCJ7bXV0ZWQ6IGlzTXV0ZWR9XFxcIj48L3ZpZGVvPlxcbjwvZGl2PlwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInXSxcblxuXHRpbml0OiBmdW5jdGlvbiAoZWx0LCBwYWdlcikge1xuXG5cdFx0bGV0IHNvY2sgPSBudWxsXG5cblx0XHRjb25zdCBjb25zdHJhaW50cyA9IHsgdmlkZW86IHRydWUsIGF1ZGlvOiB0cnVlIH1cblx0XHRjb25zdCBtaW1lVHlwZSA9ICd2aWRlby93ZWJtOyBjb2RlY3M9b3B1cywgdnA4J1xuXG5cblx0XHRsZXQgbWVkaWFSZWNvcmRlciA9IG51bGxcblx0XHRsZXQgbWVkaWFTb3VyY2UgPSBudWxsXG5cdFx0bGV0IHNvdXJjZUJ1ZmZlciA9IG51bGxcblxuXHRcdGZ1bmN0aW9uIGNvbm5lY3QoKSB7XG5cblx0XHRcdGNvbnNvbGUubG9nKCd0cnkgdG8gY29ubmVjdC4uLicpXG5cblx0XHRcdGNvbnN0IHsgdHlwZSB9ID0gY3RybC5tb2RlbFxuXG5cdFx0XHRsZXQgeyBob3N0LCBwcm90b2NvbCB9ID0gbG9jYXRpb25cblx0XHRcdHByb3RvY29sID0gKHByb3RvY29sID09ICdodHRwOicpID8gJ3dzOicgOiAnd3NzOidcblxuXG5cdFx0XHRjb25zdCB1cmwgPSBgJHtwcm90b2NvbH0vLyR7aG9zdH0vc3RyZWFtLyR7dHlwZX0vYFxuXHRcdFx0Y29uc29sZS5sb2coJ3VybCcsIHVybClcblxuXHRcdFx0c29jayA9IG5ldyBXZWJTb2NrZXQodXJsKVxuXHRcdFx0c29jay5iaW5hcnlUeXBlID0gJ2FycmF5YnVmZmVyJ1xuXG5cdFx0XHRzb2NrLm9ub3BlbiA9ICgpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coXCJDb25uZWN0ZWQgdG8gc3RyZWFtZXJcIilcblx0XHRcdFx0Y3RybC5zZXREYXRhKHsgaXNDb25uZWN0ZWQ6IHRydWUsIGlzU3RhcnRlZDogZmFsc2UgfSlcblxuXHRcdFx0fVxuXG5cblx0XHRcdHNvY2sub25tZXNzYWdlID0gKGV2KSA9PiB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ29ubWVzc2FnZScsIGV2LmRhdGEpXG5cdFx0XHRcdHNvdXJjZUJ1ZmZlci5hcHBlbmRCdWZmZXIoZXYuZGF0YSlcblx0XHRcdH1cblxuXHRcdFx0c29jay5vbmNsb3NlID0gKGV2KSA9PiB7XG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGlzQ29ubmVjdGVkOiBmYWxzZSB9KVxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHR0eXBlOiAnc2VydmVyJyxcblx0XHRcdFx0aXNDb25uZWN0ZWQ6IGZhbHNlLFxuXHRcdFx0XHRpc1N0YXJ0ZWQ6IGZhbHNlLFxuXHRcdFx0XHRzaG93U3RhcnQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5pc0Nvbm5lY3RlZCAmJiB0aGlzLnR5cGUgPT0gJ3NlcnZlcicgJiYgIXRoaXMuaXNTdGFydGVkXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3dTdG9wOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuaXNDb25uZWN0ZWQgJiYgdGhpcy50eXBlID09ICdzZXJ2ZXInICYmIHRoaXMuaXNTdGFydGVkXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGlzTXV0ZWQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy50eXBlID09ICdzZXJ2ZXInXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25BZGRXZWJjYXN0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25BZGRXZWJjYXN0Jylcblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYWRkV2ViY2FzdCcsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnQWRkIFdlYmNhc3QnXG5cdFx0XHRcdFx0fSlcblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNvbm5lY3Q6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjb25uZWN0KClcblx0XHRcdFx0XHRpZiAoY3RybC5tb2RlbC50eXBlID09ICdjbGllbnQnKSB7XG5cdFx0XHRcdFx0XHRtZWRpYVNvdXJjZSA9IG5ldyBNZWRpYVNvdXJjZSgpXG5cdFx0XHRcdFx0XHRjb25zdCB2aWRlbyA9IGN0cmwuc2NvcGUudmlkZW8uZ2V0KDApXG5cdFx0XHRcdFx0XHR2aWRlby5zcmMgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKG1lZGlhU291cmNlKVxuXHRcdFx0XHRcdFx0bWVkaWFTb3VyY2UuYWRkRXZlbnRMaXN0ZW5lcignc291cmNlb3BlbicsICgpID0+IHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3NvdXJjZSBvcGVuZWQnKVxuXHRcdFx0XHRcdFx0XHRVUkwucmV2b2tlT2JqZWN0VVJMKHZpZGVvLnNyYylcblx0XHRcdFx0XHRcdFx0c291cmNlQnVmZmVyID0gbWVkaWFTb3VyY2UuYWRkU291cmNlQnVmZmVyKG1pbWVUeXBlKVxuXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvblN0YXJ0OiBhc3luYyBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uU3RhcnQnKVxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRjb25zdCBzdHJlYW0gPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYShjb25zdHJhaW50cylcblx0XHRcdFx0XHRcdGNvbnN0IHZpZGVvID0gY3RybC5zY29wZS52aWRlby5nZXQoMClcblx0XHRcdFx0XHRcdHZpZGVvLnNyY09iamVjdCA9IHN0cmVhbVxuXHRcdFx0XHRcdFx0dmlkZW8ubG9hZCgpXG5cblx0XHRcdFx0XHRcdG1lZGlhUmVjb3JkZXIgPSBuZXcgTWVkaWFSZWNvcmRlcihzdHJlYW0sIHsgdHlwZTogbWltZVR5cGUgfSlcblx0XHRcdFx0XHRcdG1lZGlhUmVjb3JkZXIub25kYXRhYXZhaWxhYmxlID0gYXN5bmMgZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uZGF0YWF2YWlsYWJsZScsIGV2LmRhdGEpXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGJ1ZmZlciA9IGF3YWl0IGV2LmRhdGEuYXJyYXlCdWZmZXIoKVxuXHRcdFx0XHRcdFx0XHRzb2NrLnNlbmQoYnVmZmVyKVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRtZWRpYVJlY29yZGVyLnN0YXJ0KDUwMClcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGlzU3RhcnRlZDogdHJ1ZSB9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjYXRjaCAoZSkge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihlKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvblN0b3A6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25TdG9wJylcblx0XHRcdFx0XHRtZWRpYVJlY29yZGVyLnN0b3AoKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGlzU3RhcnRlZDogZmFsc2UgfSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iXX0=
