//@ts-check
(function () {

	function getTime(duration) {
		const d = new Date(duration * 1000)
		const v = d.getMinutes() + d.getSeconds() / 100
		return v.toFixed(2).replace('.', ':')
	}


	$$.control.registerControl('breizbot.audioplayer', {

		template: { gulp_inject: './player.html' },

		deps: ['breizbot.pager'],

		props: {
			filterExtension: '',
			getMP3Info: false,
			showMp3Filter: false
		},

		/**
		 * @param {Breizbot.Services.Pager.Interface} pager
		 */
		init: function (elt, pager) {

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
							onReturn: async function (data) {
								console.log('data', data)
								const {fileName, url, mp3} = data
								if (mp3 && mp3.title) {
									const {artist, title} = mp3
									ctrl.setData({artist, title, url})	
								}
								else { 
									ctrl.setData({url, name: fileName})	
								}
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



