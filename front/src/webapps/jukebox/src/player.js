(function() {

function getTime(duration) {
	const d = new Date(duration * 1000)
	const v = d.getMinutes() + d.getSeconds()/100
	return v.toFixed(2).replace('.', ':')
}


$$.control.registerControl('player', {

	template: {gulp_inject: './player.html'},

	deps: ['breizbot.files', 'breizbot.http', 'breizbot.pager'],

	props: {
		rootDir: '',
		files: [],
		firstIdx: 0,
		friendUser: ''
	},

	init: function(elt, filesSrv, http, pager) {

		const {rootDir, files, firstIdx, friendUser} = this.props

		let shuffleIndexes = null

		let wakeLock = null
		
		if (navigator.wakeLock && navigator.wakeLock.request) {
			navigator.wakeLock.request('screen').then((lock) => {
				console.log('take wakeLock')
				wakeLock = lock
				wakeLock.addEventListener('release', () => {
					console.log('Wake Lock was released');
				  })
			})
			.catch((e) => {
				$$.ui.showAlert({title: "WakeLock", content: e})
			})
	
		}

		this.dispose = function() {
			if (wakeLock != null) {
				console.log('release wakeLock')
				wakeLock.release()
			}
		}


		const ctrl = $$.viewController(elt, {
			data: {
				idx: firstIdx,
				nbFiles: files.length,
				src: getFileUrl(firstIdx),
				name: getName(firstIdx),
				title: getTitle(firstIdx),
				artist: getArtist(firstIdx),
				duration: 0,
				curTime: 0,
				playing: false,
				prop1: function() {
					return {disabled: !(this.idx > 0)}
				},
				prop2: function() {
					return {disabled: !(this.idx < this.nbFiles - 1)}
				},
				getTimeInfo: function() {
					return `${getTime(this.curTime)} / ${getTime(this.duration)}`
				}

			},
			events: {
				onLoad: function() {
					//console.log('duration', this.duration)
					ctrl.setData({duration: Math.floor(this.duration)})
				},

				onTimeUpdate: function() {
					ctrl.setData({curTime: this.currentTime})
				},

				onPlaying: function() {
					//console.log('onPlaying')
					ctrl.setData({playing: true})
				},

				onPaused: function() {
					//console.log('onPaused')
					ctrl.setData({playing: false})
				},

				onPlay: function() {
					audio.play()
				},

				onPause: function() {
					audio.pause()
				},

				onSliderChange: function(ev, value) {
					//console.log('onSliderChange', value)
					audio.currentTime = value
				},

				onShuffleChange: function(ev, value) {
					//console.log('onShuffleChange', value)
					if (value == 'ON') {
						shuffleIndexes = knuthShuffle(ctrl.model.nbFiles)
						//console.log('shuffleIndexes', shuffleIndexes)
					}
					else {
						shuffleIndexes = null
					}
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
			if (shuffleIndexes != null) {
				if (shuffleIndexes.length > 0) {
					setIndex(shuffleIndexes.pop())
				}
				return
			}

			let {idx, nbFiles} = ctrl.model
			if (idx < nbFiles - 1) {
				setIndex(idx+1)
			}
		}

		function setIndex(idx) {
			ctrl.setData({
				src: getFileUrl(idx),
				title: getTitle(idx),
				name: getName(idx),
				artist: getArtist(idx),
				idx
			})						
		}

		function knuthShuffle(length) {
			//console.log('knuthShuffle', length)
			let arr = []
			for(let k = 0; k < length; k++) {
				arr.push(k)
			}

		    var rand, temp, i;
		 
		    for (i = arr.length - 1; i > 0; i -= 1) {
		        rand = Math.floor((i + 1) * Math.random());//get random between zero and i (inclusive)
		        temp = arr[rand];//swap i and the zero-indexed number
		        arr[rand] = arr[i];
		        arr[i] = temp;
		    }
		    return arr;
		}		


		const audio = ctrl.scope.audio.get(0)

		function getName(idx) {
			return files[idx].name
		}

		function getTitle(idx) {
			return files[idx].mp3.title || ''
		}

		function getArtist(idx) {
			return files[idx].mp3.artist || ''
		}

		function getFileUrl(idx) {
			return filesSrv.fileUrl(rootDir + files[idx].name, friendUser)
		}

		this.getButtons = function() {
			return {
				editInfo: {
					title: 'Edit Info',
					icon: 'fa fa-edit',
					onClick: function() {
						const {idx, name} = ctrl.model
						pager.pushPage('editDlg', {
							title: 'Edit MP3 Info',
							props: {
								data: files[idx].mp3,
								fileName: name
							},
							onReturn: function(tags) {
								//console.group('onReturn', tags)
								files[idx].mp3 = tags
								ctrl.setData(tags)
								http.post('/saveInfo', {
									filePath: rootDir + name,
									friendUser,
									tags
								})			
							}
						})
	
					}
				}
			}
		}

	}


});

})();



