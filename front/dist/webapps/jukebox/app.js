$$.control.registerControl('rootPage', {

	template: "<p>Select a file system</p>\n\n<ul class=\"w3-ul w3-border w3-white\">\n	<li class=\"w3-bar\" bn-event=\"click: onHome\">\n		<div class=\"w3-bar-item\">\n			<i class=\"fa fa-home fa-2x fa-fw w3-text-blue\"></i>\n			<span>Your home files</span>\n		</div>\n	</li>\n\n	<li class=\"w3-bar\" bn-event=\"click: onShare\">\n		<div class=\"w3-bar-item\">\n			<i class=\"fa fa-share-alt fa-2x fa-fw w3-text-blue\"></i>\n			<span>Files shared by your friends</span>\n		</div>\n	</li>\n</ul>	",

	deps: ['breizbot.pager'],

	init: function(elt, pager) {

		function openFilePage(title, friendUser) {
			pager.pushPage('breizbot.files', {
				title,
				props: {
					filterExtension: '.mp3',
					getMP3Info: true,
					friendUser
				},
				events: {
					fileclick: function(ev, info) {
						const {rootDir, fileName } = info
						const iface = $(this).iface()
						const files = iface.getFiles()
						//console.log('files', files)
						const firstIdx = files.findIndex((f) => f.name == fileName)
						//console.log('firstIdx', firstIdx)
						pager.pushPage('player', {
							title: 'Player',
							props: {
								firstIdx,
								files,
								rootDir,
								friendUser
							},
							onBack: function() {
								iface.update()
							}
						})
	
					}
				}	
			})				

		}

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onHome: function() {
					openFilePage('Home files', '')
				},
				onShare: function() {
					pager.pushPage('breizbot.friends', {
						title: 'Shared files',
						props: {
							showConnectionState: false
						},
						events: {
							friendclick: function(ev, data) {
								//console.log('onSelectFriend', data)
								const {userName} = data
								openFilePage(userName, userName)			
							}
						}					
					})
				}

			}
		})

	}


});





(function() {

function getTime(duration) {
	const d = new Date(duration * 1000)
	const v = d.getMinutes() + d.getSeconds()/100
	return v.toFixed(2).replace('.', ':')
}


$$.control.registerControl('player', {

	template: "<div class=\"title\">\n	<strong>FileName:&nbsp;</strong>\n	<span bn-text=\"name\"></span>\n</div>\n<div class=\"title\" bn-show=\"title\">\n	<strong>Title:&nbsp;</strong>\n	<span bn-text=\"title\"></span>\n</div>\n<div class=\"title\" bn-show=\"artist\">\n	<strong>Artist:&nbsp;</strong>\n	<span bn-text=\"artist\"></span>\n</div>\n<div class=\"toolbar\">\n	<div>\n		<button bn-prop=\"prop1\" bn-event=\"click: onPrev\" class=\"w3-btn w3-blue\" title=\"Previous\">\n			<i class=\"fa fa-lg fa-step-backward\"></i>\n		</button>\n		\n		<button bn-show=\"!playing\" bn-event=\"click: onPlay\" class=\"w3-btn w3-blue\" title=\"Play\">\n			<i class=\"fa fa-lg fa-play\"></i>\n		</button>\n		\n		<button bn-show=\"playing\" bn-event=\"click: onPause\" class=\"w3-btn w3-blue\" title=\"Pause\">\n			<i class=\"fa fa-lg fa-pause\"></i>\n		</button>\n		\n		<button bn-prop=\"prop2\" bn-event=\"click: onNext\" class=\"w3-btn w3-blue\" title=\"Next\">\n			<i class=\"fa fa-lg fa-step-forward\"></i>\n		</button>	\n	</div>	\n\n		<button bn-event=\"click: onEditInfo\" class=\"w3-btn w3-blue\" title=\"Edit Info\">\n			<i class=\"fa fa-lg fa-edit\"></i>\n		</button>		\n\n</div>\n\n<div class=\"shuffle\">\n	<span>Shuffle</span>\n	<div \n		bn-control=\"brainjs.flipswitch\"\n		bn-event=\"flipswitchchange: onShuffleChange\"\n		data-width=\"100\"\n		data-height=\"25\"\n		>\n		\n	</div>			\n</div>\n\n\n<div class=\"slider\">\n	<span bn-text=\"getTimeInfo\"></span>\n	<div bn-control=\"brainjs.slider\" \n		bn-data=\"{max: duration}\"\n		bn-event=\"input: onSliderChange\" 		 \n		bn-val=\"curTime\">		\n	</div>\n	\n</div>\n\n<audio \n	bn-attr=\"{src}\" \n	bn-bind=\"audio\"\n	autoplay=\"\" \n	bn-event=\"canplay: onLoad, timeupdate: onTimeUpdate, playing: onPlaying, pause: onPaused, ended: onEnded\">		\n</audio>\n",

	deps: ['breizbot.files', 'breizbot.http'],

	props: {
		rootDir: '',
		files: [],
		firstIdx: 0,
		friendUser: ''
	},

	init: function(elt, filesSrv, http) {

		const {rootDir, files, firstIdx, friendUser} = this.props

		let shuffleIndexes = null

		let wakeLock = null
		
		if (navigator.wakeLock && navigator.wakeLock.request) {
			navigator.wakeLock.request('screen').then((lock) => {
				console.log('take wakeLock')
				wakeLock = lock
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

		const editDlg = $$.formDialogController({
			template: "<div class=\"editDlg\">\n    <input type=\"text\" name=\"name\" hidden>\n    <label>Title</label>\n    <input type=\"text\" name=\"title\" required>\n    <button type=\"button\" title=\"Find Info\" bn-event=\"click: onFindInfo\" class=\"w3-btn w3-blue\">\n        <i class=\"fa fa-info\"></i>\n    </button>\n    <label>Artist</label>\n    <input type=\"text\" name=\"artist\" required>\n</div>\n",
			title: 'MP3 Information',
			width: 'auto',
			events: {
				onFindInfo: function() {
					const {name} = editDlg.getData()
					http.post('/search', {
						query: name.replace('.mp3', ''),
					}).then((data) => {
						console.log(data)
						if (data && data.title) {
							editDlg.setData(data)
						}
						else {
							$$.ui.showAlert({title: 'MP3 Information', content: 'No information found !'})
						}

					})

				}
			}
		})

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

				onEditInfo: function() {
					const {idx, name} = ctrl.model
					const data = $.extend({name}, files[idx].mp3)
					editDlg.setData(data, true)
					editDlg.show(function(data) {
						console.log(data)
						const tags = {
							title: data.title,
							artist: data.artist
						}
						files[idx].mp3 = tags
						ctrl.setData(tags)
						http.post('/saveInfo', {
							filePath: rootDir + data.name,
							friendUser,
							tags
						})


					})
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



	}


});

})();




//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJwbGF5ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncm9vdFBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPHA+U2VsZWN0IGEgZmlsZSBzeXN0ZW08L3A+XFxuXFxuPHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGVcXFwiPlxcblx0PGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25Ib21lXFxcIj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1ob21lIGZhLTJ4IGZhLWZ3IHczLXRleHQtYmx1ZVxcXCI+PC9pPlxcblx0XHRcdDxzcGFuPllvdXIgaG9tZSBmaWxlczwvc3Bhbj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2xpPlxcblxcblx0PGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25TaGFyZVxcXCI+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtc2hhcmUtYWx0IGZhLTJ4IGZhLWZ3IHczLXRleHQtYmx1ZVxcXCI+PC9pPlxcblx0XHRcdDxzcGFuPkZpbGVzIHNoYXJlZCBieSB5b3VyIGZyaWVuZHM8L3NwYW4+XFxuXHRcdDwvZGl2Plxcblx0PC9saT5cXG48L3VsPlx0XCIsXG5cblx0ZGVwczogWydicmVpemJvdC5wYWdlciddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgcGFnZXIpIHtcblxuXHRcdGZ1bmN0aW9uIG9wZW5GaWxlUGFnZSh0aXRsZSwgZnJpZW5kVXNlcikge1xuXHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmZpbGVzJywge1xuXHRcdFx0XHR0aXRsZSxcblx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRmaWx0ZXJFeHRlbnNpb246ICcubXAzJyxcblx0XHRcdFx0XHRnZXRNUDNJbmZvOiB0cnVlLFxuXHRcdFx0XHRcdGZyaWVuZFVzZXJcblx0XHRcdFx0fSxcblx0XHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdFx0ZmlsZWNsaWNrOiBmdW5jdGlvbihldiwgaW5mbykge1xuXHRcdFx0XHRcdFx0Y29uc3Qge3Jvb3REaXIsIGZpbGVOYW1lIH0gPSBpbmZvXG5cdFx0XHRcdFx0XHRjb25zdCBpZmFjZSA9ICQodGhpcykuaWZhY2UoKVxuXHRcdFx0XHRcdFx0Y29uc3QgZmlsZXMgPSBpZmFjZS5nZXRGaWxlcygpXG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWxlcycsIGZpbGVzKVxuXHRcdFx0XHRcdFx0Y29uc3QgZmlyc3RJZHggPSBmaWxlcy5maW5kSW5kZXgoKGYpID0+IGYubmFtZSA9PSBmaWxlTmFtZSlcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpcnN0SWR4JywgZmlyc3RJZHgpXG5cdFx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgncGxheWVyJywge1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ1BsYXllcicsXG5cdFx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdFx0Zmlyc3RJZHgsXG5cdFx0XHRcdFx0XHRcdFx0ZmlsZXMsXG5cdFx0XHRcdFx0XHRcdFx0cm9vdERpcixcblx0XHRcdFx0XHRcdFx0XHRmcmllbmRVc2VyXG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdG9uQmFjazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWZhY2UudXBkYXRlKClcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSlcblx0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XHRcblx0XHRcdH0pXHRcdFx0XHRcblxuXHRcdH1cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25Ib21lOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRvcGVuRmlsZVBhZ2UoJ0hvbWUgZmlsZXMnLCAnJylcblx0XHRcdFx0fSxcblx0XHRcdFx0b25TaGFyZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmZyaWVuZHMnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ1NoYXJlZCBmaWxlcycsXG5cdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRzaG93Q29ubmVjdGlvblN0YXRlOiBmYWxzZVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRcdFx0XHRmcmllbmRjbGljazogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblNlbGVjdEZyaWVuZCcsIGRhdGEpXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3Qge3VzZXJOYW1lfSA9IGRhdGFcblx0XHRcdFx0XHRcdFx0XHRvcGVuRmlsZVBhZ2UodXNlck5hbWUsIHVzZXJOYW1lKVx0XHRcdFxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIoZnVuY3Rpb24oKSB7XG5cbmZ1bmN0aW9uIGdldFRpbWUoZHVyYXRpb24pIHtcblx0Y29uc3QgZCA9IG5ldyBEYXRlKGR1cmF0aW9uICogMTAwMClcblx0Y29uc3QgdiA9IGQuZ2V0TWludXRlcygpICsgZC5nZXRTZWNvbmRzKCkvMTAwXG5cdHJldHVybiB2LnRvRml4ZWQoMikucmVwbGFjZSgnLicsICc6Jylcbn1cblxuXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncGxheWVyJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRpdGxlXFxcIj5cXG5cdDxzdHJvbmc+RmlsZU5hbWU6Jm5ic3A7PC9zdHJvbmc+XFxuXHQ8c3BhbiBibi10ZXh0PVxcXCJuYW1lXFxcIj48L3NwYW4+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwidGl0bGVcXFwiIGJuLXNob3c9XFxcInRpdGxlXFxcIj5cXG5cdDxzdHJvbmc+VGl0bGU6Jm5ic3A7PC9zdHJvbmc+XFxuXHQ8c3BhbiBibi10ZXh0PVxcXCJ0aXRsZVxcXCI+PC9zcGFuPlxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcInRpdGxlXFxcIiBibi1zaG93PVxcXCJhcnRpc3RcXFwiPlxcblx0PHN0cm9uZz5BcnRpc3Q6Jm5ic3A7PC9zdHJvbmc+XFxuXHQ8c3BhbiBibi10ZXh0PVxcXCJhcnRpc3RcXFwiPjwvc3Bhbj5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cdDxkaXY+XFxuXHRcdDxidXR0b24gYm4tcHJvcD1cXFwicHJvcDFcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25QcmV2XFxcIiBjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJQcmV2aW91c1xcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWxnIGZhLXN0ZXAtYmFja3dhcmRcXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XFxuXHRcdFxcblx0XHQ8YnV0dG9uIGJuLXNob3c9XFxcIiFwbGF5aW5nXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uUGxheVxcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiUGxheVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWxnIGZhLXBsYXlcXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XFxuXHRcdFxcblx0XHQ8YnV0dG9uIGJuLXNob3c9XFxcInBsYXlpbmdcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25QYXVzZVxcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiUGF1c2VcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1sZyBmYS1wYXVzZVxcXCI+PC9pPlxcblx0XHQ8L2J1dHRvbj5cXG5cdFx0XFxuXHRcdDxidXR0b24gYm4tcHJvcD1cXFwicHJvcDJcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25OZXh0XFxcIiBjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJOZXh0XFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtbGcgZmEtc3RlcC1mb3J3YXJkXFxcIj48L2k+XFxuXHRcdDwvYnV0dG9uPlx0XFxuXHQ8L2Rpdj5cdFxcblxcblx0XHQ8YnV0dG9uIGJuLWV2ZW50PVxcXCJjbGljazogb25FZGl0SW5mb1xcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiRWRpdCBJbmZvXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtbGcgZmEtZWRpdFxcXCI+PC9pPlxcblx0XHQ8L2J1dHRvbj5cdFx0XFxuXFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwic2h1ZmZsZVxcXCI+XFxuXHQ8c3Bhbj5TaHVmZmxlPC9zcGFuPlxcblx0PGRpdiBcXG5cdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy5mbGlwc3dpdGNoXFxcIlxcblx0XHRibi1ldmVudD1cXFwiZmxpcHN3aXRjaGNoYW5nZTogb25TaHVmZmxlQ2hhbmdlXFxcIlxcblx0XHRkYXRhLXdpZHRoPVxcXCIxMDBcXFwiXFxuXHRcdGRhdGEtaGVpZ2h0PVxcXCIyNVxcXCJcXG5cdFx0Plxcblx0XHRcXG5cdDwvZGl2Plx0XHRcdFxcbjwvZGl2PlxcblxcblxcbjxkaXYgY2xhc3M9XFxcInNsaWRlclxcXCI+XFxuXHQ8c3BhbiBibi10ZXh0PVxcXCJnZXRUaW1lSW5mb1xcXCI+PC9zcGFuPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLnNsaWRlclxcXCIgXFxuXHRcdGJuLWRhdGE9XFxcInttYXg6IGR1cmF0aW9ufVxcXCJcXG5cdFx0Ym4tZXZlbnQ9XFxcImlucHV0OiBvblNsaWRlckNoYW5nZVxcXCIgXHRcdCBcXG5cdFx0Ym4tdmFsPVxcXCJjdXJUaW1lXFxcIj5cdFx0XFxuXHQ8L2Rpdj5cXG5cdFxcbjwvZGl2PlxcblxcbjxhdWRpbyBcXG5cdGJuLWF0dHI9XFxcIntzcmN9XFxcIiBcXG5cdGJuLWJpbmQ9XFxcImF1ZGlvXFxcIlxcblx0YXV0b3BsYXk9XFxcIlxcXCIgXFxuXHRibi1ldmVudD1cXFwiY2FucGxheTogb25Mb2FkLCB0aW1ldXBkYXRlOiBvblRpbWVVcGRhdGUsIHBsYXlpbmc6IG9uUGxheWluZywgcGF1c2U6IG9uUGF1c2VkLCBlbmRlZDogb25FbmRlZFxcXCI+XHRcdFxcbjwvYXVkaW8+XFxuXCIsXG5cblx0ZGVwczogWydicmVpemJvdC5maWxlcycsICdicmVpemJvdC5odHRwJ10sXG5cblx0cHJvcHM6IHtcblx0XHRyb290RGlyOiAnJyxcblx0XHRmaWxlczogW10sXG5cdFx0Zmlyc3RJZHg6IDAsXG5cdFx0ZnJpZW5kVXNlcjogJydcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIGZpbGVzU3J2LCBodHRwKSB7XG5cblx0XHRjb25zdCB7cm9vdERpciwgZmlsZXMsIGZpcnN0SWR4LCBmcmllbmRVc2VyfSA9IHRoaXMucHJvcHNcblxuXHRcdGxldCBzaHVmZmxlSW5kZXhlcyA9IG51bGxcblxuXHRcdGxldCB3YWtlTG9jayA9IG51bGxcblx0XHRcblx0XHRpZiAobmF2aWdhdG9yLndha2VMb2NrICYmIG5hdmlnYXRvci53YWtlTG9jay5yZXF1ZXN0KSB7XG5cdFx0XHRuYXZpZ2F0b3Iud2FrZUxvY2sucmVxdWVzdCgnc2NyZWVuJykudGhlbigobG9jaykgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygndGFrZSB3YWtlTG9jaycpXG5cdFx0XHRcdHdha2VMb2NrID0gbG9ja1xuXHRcdFx0fSlcblx0XHRcdC5jYXRjaCgoZSkgPT4ge1xuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiBcIldha2VMb2NrXCIsIGNvbnRlbnQ6IGV9KVxuXHRcdFx0fSlcblx0XG5cdFx0fVxuXG5cdFx0dGhpcy5kaXNwb3NlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAod2FrZUxvY2sgIT0gbnVsbCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygncmVsZWFzZSB3YWtlTG9jaycpXG5cdFx0XHRcdHdha2VMb2NrLnJlbGVhc2UoKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGNvbnN0IGVkaXREbGcgPSAkJC5mb3JtRGlhbG9nQ29udHJvbGxlcih7XG5cdFx0XHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJlZGl0RGxnXFxcIj5cXG4gICAgPGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcIm5hbWVcXFwiIGhpZGRlbj5cXG4gICAgPGxhYmVsPlRpdGxlPC9sYWJlbD5cXG4gICAgPGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcInRpdGxlXFxcIiByZXF1aXJlZD5cXG4gICAgPGJ1dHRvbiB0eXBlPVxcXCJidXR0b25cXFwiIHRpdGxlPVxcXCJGaW5kIEluZm9cXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25GaW5kSW5mb1xcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIj5cXG4gICAgICAgIDxpIGNsYXNzPVxcXCJmYSBmYS1pbmZvXFxcIj48L2k+XFxuICAgIDwvYnV0dG9uPlxcbiAgICA8bGFiZWw+QXJ0aXN0PC9sYWJlbD5cXG4gICAgPGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcImFydGlzdFxcXCIgcmVxdWlyZWQ+XFxuPC9kaXY+XFxuXCIsXG5cdFx0XHR0aXRsZTogJ01QMyBJbmZvcm1hdGlvbicsXG5cdFx0XHR3aWR0aDogJ2F1dG8nLFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uRmluZEluZm86IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IHtuYW1lfSA9IGVkaXREbGcuZ2V0RGF0YSgpXG5cdFx0XHRcdFx0aHR0cC5wb3N0KCcvc2VhcmNoJywge1xuXHRcdFx0XHRcdFx0cXVlcnk6IG5hbWUucmVwbGFjZSgnLm1wMycsICcnKSxcblx0XHRcdFx0XHR9KS50aGVuKChkYXRhKSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhkYXRhKVxuXHRcdFx0XHRcdFx0aWYgKGRhdGEgJiYgZGF0YS50aXRsZSkge1xuXHRcdFx0XHRcdFx0XHRlZGl0RGxnLnNldERhdGEoZGF0YSlcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnTVAzIEluZm9ybWF0aW9uJywgY29udGVudDogJ05vIGluZm9ybWF0aW9uIGZvdW5kICEnfSlcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGlkeDogZmlyc3RJZHgsXG5cdFx0XHRcdG5iRmlsZXM6IGZpbGVzLmxlbmd0aCxcblx0XHRcdFx0c3JjOiBnZXRGaWxlVXJsKGZpcnN0SWR4KSxcblx0XHRcdFx0bmFtZTogZ2V0TmFtZShmaXJzdElkeCksXG5cdFx0XHRcdHRpdGxlOiBnZXRUaXRsZShmaXJzdElkeCksXG5cdFx0XHRcdGFydGlzdDogZ2V0QXJ0aXN0KGZpcnN0SWR4KSxcblx0XHRcdFx0ZHVyYXRpb246IDAsXG5cdFx0XHRcdGN1clRpbWU6IDAsXG5cdFx0XHRcdHBsYXlpbmc6IGZhbHNlLFxuXHRcdFx0XHRwcm9wMTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHtkaXNhYmxlZDogISh0aGlzLmlkeCA+IDApfVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRwcm9wMjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHtkaXNhYmxlZDogISh0aGlzLmlkeCA8IHRoaXMubmJGaWxlcyAtIDEpfVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRnZXRUaW1lSW5mbzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGAke2dldFRpbWUodGhpcy5jdXJUaW1lKX0gLyAke2dldFRpbWUodGhpcy5kdXJhdGlvbil9YFxuXHRcdFx0XHR9XG5cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25Mb2FkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdkdXJhdGlvbicsIHRoaXMuZHVyYXRpb24pXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtkdXJhdGlvbjogTWF0aC5mbG9vcih0aGlzLmR1cmF0aW9uKX0pXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25UaW1lVXBkYXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe2N1clRpbWU6IHRoaXMuY3VycmVudFRpbWV9KVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uUGxheWluZzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25QbGF5aW5nJylcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3BsYXlpbmc6IHRydWV9KVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uUGF1c2VkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblBhdXNlZCcpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtwbGF5aW5nOiBmYWxzZX0pXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25FZGl0SW5mbzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3Qge2lkeCwgbmFtZX0gPSBjdHJsLm1vZGVsXG5cdFx0XHRcdFx0Y29uc3QgZGF0YSA9ICQuZXh0ZW5kKHtuYW1lfSwgZmlsZXNbaWR4XS5tcDMpXG5cdFx0XHRcdFx0ZWRpdERsZy5zZXREYXRhKGRhdGEsIHRydWUpXG5cdFx0XHRcdFx0ZWRpdERsZy5zaG93KGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKGRhdGEpXG5cdFx0XHRcdFx0XHRjb25zdCB0YWdzID0ge1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogZGF0YS50aXRsZSxcblx0XHRcdFx0XHRcdFx0YXJ0aXN0OiBkYXRhLmFydGlzdFxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZmlsZXNbaWR4XS5tcDMgPSB0YWdzXG5cdFx0XHRcdFx0XHRjdHJsLnNldERhdGEodGFncylcblx0XHRcdFx0XHRcdGh0dHAucG9zdCgnL3NhdmVJbmZvJywge1xuXHRcdFx0XHRcdFx0XHRmaWxlUGF0aDogcm9vdERpciArIGRhdGEubmFtZSxcblx0XHRcdFx0XHRcdFx0ZnJpZW5kVXNlcixcblx0XHRcdFx0XHRcdFx0dGFnc1xuXHRcdFx0XHRcdFx0fSlcblxuXG5cdFx0XHRcdFx0fSlcbiBcdFx0XHRcdH0sXG5cblx0XHRcdFx0b25QbGF5OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRhdWRpby5wbGF5KClcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvblBhdXNlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRhdWRpby5wYXVzZSgpXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25TbGlkZXJDaGFuZ2U6IGZ1bmN0aW9uKGV2LCB2YWx1ZSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uU2xpZGVyQ2hhbmdlJywgdmFsdWUpXG5cdFx0XHRcdFx0YXVkaW8uY3VycmVudFRpbWUgPSB2YWx1ZVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uU2h1ZmZsZUNoYW5nZTogZnVuY3Rpb24oZXYsIHZhbHVlKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25TaHVmZmxlQ2hhbmdlJywgdmFsdWUpXG5cdFx0XHRcdFx0aWYgKHZhbHVlID09ICdPTicpIHtcblx0XHRcdFx0XHRcdHNodWZmbGVJbmRleGVzID0ga251dGhTaHVmZmxlKGN0cmwubW9kZWwubmJGaWxlcylcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ3NodWZmbGVJbmRleGVzJywgc2h1ZmZsZUluZGV4ZXMpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0c2h1ZmZsZUluZGV4ZXMgPSBudWxsXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uRW5kZWQ6IG5leHQsXG5cblx0XHRcdFx0b25QcmV2OiBwcmV2LFxuXG5cdFx0XHRcdG9uTmV4dDogbmV4dFxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGZ1bmN0aW9uIHByZXYoKSB7XG5cdFx0XHRsZXQge2lkeH0gPSBjdHJsLm1vZGVsXG5cdFx0XHRpZiAoaWR4ID4gMCkge1xuXHRcdFx0XHRzZXRJbmRleChpZHgtMSlcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBuZXh0KCkge1xuXHRcdFx0aWYgKHNodWZmbGVJbmRleGVzICE9IG51bGwpIHtcblx0XHRcdFx0aWYgKHNodWZmbGVJbmRleGVzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRzZXRJbmRleChzaHVmZmxlSW5kZXhlcy5wb3AoKSlcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblxuXHRcdFx0bGV0IHtpZHgsIG5iRmlsZXN9ID0gY3RybC5tb2RlbFxuXHRcdFx0aWYgKGlkeCA8IG5iRmlsZXMgLSAxKSB7XG5cdFx0XHRcdHNldEluZGV4KGlkeCsxKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNldEluZGV4KGlkeCkge1xuXHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0c3JjOiBnZXRGaWxlVXJsKGlkeCksXG5cdFx0XHRcdHRpdGxlOiBnZXRUaXRsZShpZHgpLFxuXHRcdFx0XHRuYW1lOiBnZXROYW1lKGlkeCksXG5cdFx0XHRcdGFydGlzdDogZ2V0QXJ0aXN0KGlkeCksXG5cdFx0XHRcdGlkeFxuXHRcdFx0fSlcdFx0XHRcdFx0XHRcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBrbnV0aFNodWZmbGUobGVuZ3RoKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdrbnV0aFNodWZmbGUnLCBsZW5ndGgpXG5cdFx0XHRsZXQgYXJyID0gW11cblx0XHRcdGZvcihsZXQgayA9IDA7IGsgPCBsZW5ndGg7IGsrKykge1xuXHRcdFx0XHRhcnIucHVzaChrKVxuXHRcdFx0fVxuXG5cdFx0ICAgIHZhciByYW5kLCB0ZW1wLCBpO1xuXHRcdCBcblx0XHQgICAgZm9yIChpID0gYXJyLmxlbmd0aCAtIDE7IGkgPiAwOyBpIC09IDEpIHtcblx0XHQgICAgICAgIHJhbmQgPSBNYXRoLmZsb29yKChpICsgMSkgKiBNYXRoLnJhbmRvbSgpKTsvL2dldCByYW5kb20gYmV0d2VlbiB6ZXJvIGFuZCBpIChpbmNsdXNpdmUpXG5cdFx0ICAgICAgICB0ZW1wID0gYXJyW3JhbmRdOy8vc3dhcCBpIGFuZCB0aGUgemVyby1pbmRleGVkIG51bWJlclxuXHRcdCAgICAgICAgYXJyW3JhbmRdID0gYXJyW2ldO1xuXHRcdCAgICAgICAgYXJyW2ldID0gdGVtcDtcblx0XHQgICAgfVxuXHRcdCAgICByZXR1cm4gYXJyO1xuXHRcdH1cdFx0XG5cblxuXHRcdGNvbnN0IGF1ZGlvID0gY3RybC5zY29wZS5hdWRpby5nZXQoMClcblxuXHRcdGZ1bmN0aW9uIGdldE5hbWUoaWR4KSB7XG5cdFx0XHRyZXR1cm4gZmlsZXNbaWR4XS5uYW1lXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0VGl0bGUoaWR4KSB7XG5cdFx0XHRyZXR1cm4gZmlsZXNbaWR4XS5tcDMudGl0bGUgfHwgJydcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRBcnRpc3QoaWR4KSB7XG5cdFx0XHRyZXR1cm4gZmlsZXNbaWR4XS5tcDMuYXJ0aXN0IHx8ICcnXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0RmlsZVVybChpZHgpIHtcblx0XHRcdHJldHVybiBmaWxlc1Nydi5maWxlVXJsKHJvb3REaXIgKyBmaWxlc1tpZHhdLm5hbWUsIGZyaWVuZFVzZXIpXG5cdFx0fVxuXG5cblxuXHR9XG5cblxufSk7XG5cbn0pKCk7XG5cblxuXG4iXX0=
