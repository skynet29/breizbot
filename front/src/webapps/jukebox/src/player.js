$$.control.registerControl('player', {

	template: {gulp_inject: './player.html'},

	deps: ['breizbot.files'],

	props: {
		rootDir: '',
		files: [],
		firstIdx: 0,
		$pager: null
	},

	init: function(elt, filesSrv) {

		const {rootDir, files, firstIdx, $pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				idx: firstIdx,
				nbFiles: files.length,
				src: getFileUrl(firstIdx),
				title: getTitle(firstIdx),
				duration: 0,
				curTime: 0,
				playing: false,
				getTime :function(duration) {
					const d = new Date(duration * 1000)
					const v = d.getMinutes() + d.getSeconds()/100
					return v.toFixed(2).replace('.', ':')
				},
				getTimeInfo: function() {
					return `${getTime(curTime)} / ${getTime(duration)}`
				}

			},
			events: {
				onLoad: function() {
					console.log('duration', this.duration)
					ctrl.setData({duration: Math.floor(this.duration)})
				},

				onTimeUpdate: function() {
					ctrl.setData({curTime: this.currentTime})
				},

				onPlaying: function() {
					console.log('onPlaying')
					ctrl.setData({playing: true})
				},

				onPaused: function() {
					console.log('onPaused')
					ctrl.setData({playing: false})
				},

				onPlay: function() {
					audio.play()
				},

				onPause: function() {
					audio.pause()
				},

				onSliderChange: function(ev, value) {
					console.log('onSliderChange', value)
					audio.currentTime = value
				},

				onEnded: next,

				onPrev: prev,

				onNext: next

			}
		})

		function prev() {
			let {idx} = ctrl.model
			if (idx > 0) {
				setIndex(idx-1)
			}
		}

		function next() {
			let {idx, nbFiles} = ctrl.model
			if (idx < nbFiles - 1) {
				setIndex(idx+1)
			}
		}

		function setIndex(idx) {
			ctrl.setData({
				src: getFileUrl(idx),
				title: getTitle(idx),
				idx
			})						
		}


		const audio = ctrl.scope.audio.get(0)

		function getTitle(idx) {
			return files[idx].name
		}


		function getFileUrl(idx) {
			return filesSrv.fileUrl(rootDir + files[idx].name)
		}



	}


});




