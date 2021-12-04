//@ts-check
(function () {

	function getTime(duration) {
		const d = new Date(duration * 1000)
		const v = d.getMinutes() + d.getSeconds() / 100
		return v.toFixed(2).replace('.', ':')
	}


	$$.control.registerControl('breizbot.audioplayer', {

		template: { gulp_inject: './player.html' },

		deps: ['breizbot.files', 'breizbot.pager'],

		props: {
			filterExtension: '',
			getMP3Info: false,
			showMp3Filter: false
		},

		/**
		 * @param {Breizbot.Services.Files.Interface} files
		 * @param {Breizbot.Services.Pager.Interface} pager
		 */
		init: function (elt, files, pager) {

			console.log('props', this.props)

			const { filterExtension, getMP3Info, showMp3Filter } = this.props


			const ctrl = $$.viewController(elt, {
				data: {
					url: '#',
					name: '',
					title: '',
					artist: '',
					volume: 0,
					duration: 0,
					curTime: 0,
					playing: false,
					getTimeInfo: function () {
						return `${getTime(this.curTime)} / ${getTime(this.duration)}`
					}

				},
				events: {
					onChooseFile: function () {
						pager.pushPage('breizbot.filechooser', {
							props: {
								filterExtension,
								getMP3Info,
								showMp3Filter
							},
							title: 'Choose File',
							onReturn: async function (url) {
								//console.log('url', url)
								const {fileName, friendUser} = $$.url.parseUrlParams('http://www.netos.ovh' + url)
								const info = await files.fileInfo(fileName, friendUser, {getMP3Info: true})
								//console.log('info', info.mp3)
								const {artist, title} = info.mp3
								ctrl.setData({artist, title, url})
							}
						})
	
					},					
					onVolumeChange: function (ev, value) {
						audio.volume = value
					},
					onLoad: function () {
						//console.log('duration', this.duration)
						ctrl.setData({ duration: Math.floor(audio.duration), volume: audio.volume })
					},

					onTimeUpdate: function () {
						ctrl.setData({ curTime: this.currentTime })
					},

					onPlaying: function () {
						//console.log('onPlaying')
						ctrl.setData({ playing: true })
					},

					onPaused: function () {
						//console.log('onPaused')
						ctrl.setData({ playing: false })
					},

					onPlay: function () {
						audio.play()
					},

					onPause: function () {
						audio.pause()
					},

					onSliderChange: function (ev, value) {
						//console.log('onSliderChange', value)
						audio.currentTime = value
					},


				}
			})


			/**@type {HTMLAudioElement} */
			const audio = ctrl.scope.audio.get(0)

			this.getAudioElement = function() {
				return audio
			}
		}


	});

})();



