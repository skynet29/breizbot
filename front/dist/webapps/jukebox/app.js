$$.control.registerControl('rootPage', {

	template: "<p>Select a file system</p>\n\n<ul class=\"w3-ul w3-border w3-white\">\n	<li class=\"w3-bar\" bn-event=\"click: onHome\">\n		<div class=\"w3-bar-item\">\n			<i class=\"fa fa-home fa-2x fa-fw w3-text-blue\"></i>\n			<span>Your home files</span>\n		</div>\n	</li>\n\n	<li class=\"w3-bar\" bn-event=\"click: onShare\">\n		<div class=\"w3-bar-item\">\n			<i class=\"fa fa-share-alt fa-2x fa-fw w3-text-blue\"></i>\n			<span>Files shared by your friends</span>\n		</div>\n	</li>\n</ul>	",

	deps: ['breizbot.pager'],

	init: function(elt, pager) {

		function openFilePage(title, friendUser) {
			pager.pushPage('breizbot.files', {
				title,
				props: {
					filterExtension: '.mp3',
					friendUser
				},
				events: {
					fileclick: function(ev, info) {
						const {rootDir, fileName } = info
						const files = $(this).iface().getFiles()
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

	template: "<div class=\"title\">\n	<strong>Title:&nbsp;</strong>\n	<span bn-text=\"title\"></span>\n</div>\n<div class=\"toolbar\">\n	<div>\n		<button bn-show=\"!playing\" bn-event=\"click: onPlay\" class=\"w3-btn w3-blue\">\n			<i class=\"fa fa-lg fa-play\"></i>\n		</button>\n		\n		<button bn-show=\"playing\" bn-event=\"click: onPause\" class=\"w3-btn w3-blue\">\n			<i class=\"fa fa-lg fa-pause\"></i>\n		</button>\n		\n		<button bn-prop=\"prop1\" bn-event=\"click: onPrev\" class=\"w3-btn w3-blue\">\n			<i class=\"fa fa-lg fa-step-backward\"></i>\n		</button>\n		\n		<button bn-prop=\"prop2\" bn-event=\"click: onNext\" class=\"w3-btn w3-blue\">\n			<i class=\"fa fa-lg fa-step-forward\"></i>\n		</button>		\n	</div>\n\n\n	<div class=\"shuffle\">\n		<span>Shuffle</span>\n		<div \n			bn-control=\"brainjs.flipswitch\"\n			bn-event=\"flipswitchchange: onShuffleChange\"\n			data-width=\"100\"\n			data-height=\"25\"\n			>\n			\n		</div>			\n	</div>\n\n\n</div>\n\n<div class=\"slider\">\n	<span bn-text=\"getTimeInfo\"></span>\n	<div bn-control=\"brainjs.slider\" \n		bn-data=\"{max: duration}\"\n		bn-event=\"input: onSliderChange\" 		 \n		bn-val=\"curTime\">		\n	</div>\n	\n</div>\n\n<audio \n	bn-attr=\"{src}\" \n	bn-bind=\"audio\"\n	autoplay=\"\" \n	bn-event=\"canplay: onLoad, timeupdate: onTimeUpdate, playing: onPlaying, pause: onPaused, ended: onEnded\">		\n</audio>\n",

	deps: ['breizbot.files', 'breizbot.pager'],

	props: {
		rootDir: '',
		files: [],
		firstIdx: 0,
		friendUser: ''
	},

	init: function(elt, filesSrv, pager) {

		const {rootDir, files, firstIdx, friendUser} = this.props

		let shuffleIndexes = null

		const ctrl = $$.viewController(elt, {
			data: {
				idx: firstIdx,
				nbFiles: files.length,
				src: getFileUrl(firstIdx),
				title: getTitle(firstIdx),
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

		function getTitle(idx) {
			return files[idx].name
		}


		function getFileUrl(idx) {
			return filesSrv.fileUrl(rootDir + files[idx].name, friendUser)
		}



	}


});

})();




//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJwbGF5ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxwPlNlbGVjdCBhIGZpbGUgc3lzdGVtPC9wPlxcblxcbjx1bCBjbGFzcz1cXFwidzMtdWwgdzMtYm9yZGVyIHczLXdoaXRlXFxcIj5cXG5cdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uSG9tZVxcXCI+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtaG9tZSBmYS0yeCBmYS1mdyB3My10ZXh0LWJsdWVcXFwiPjwvaT5cXG5cdFx0XHQ8c3Bhbj5Zb3VyIGhvbWUgZmlsZXM8L3NwYW4+XFxuXHRcdDwvZGl2Plxcblx0PC9saT5cXG5cXG5cdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uU2hhcmVcXFwiPlxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJ3My1iYXItaXRlbVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXNoYXJlLWFsdCBmYS0yeCBmYS1mdyB3My10ZXh0LWJsdWVcXFwiPjwvaT5cXG5cdFx0XHQ8c3Bhbj5GaWxlcyBzaGFyZWQgYnkgeW91ciBmcmllbmRzPC9zcGFuPlxcblx0XHQ8L2Rpdj5cXG5cdDwvbGk+XFxuPC91bD5cdFwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInXSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHBhZ2VyKSB7XG5cblx0XHRmdW5jdGlvbiBvcGVuRmlsZVBhZ2UodGl0bGUsIGZyaWVuZFVzZXIpIHtcblx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdicmVpemJvdC5maWxlcycsIHtcblx0XHRcdFx0dGl0bGUsXG5cdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0ZmlsdGVyRXh0ZW5zaW9uOiAnLm1wMycsXG5cdFx0XHRcdFx0ZnJpZW5kVXNlclxuXHRcdFx0XHR9LFxuXHRcdFx0XHRldmVudHM6IHtcblx0XHRcdFx0XHRmaWxlY2xpY2s6IGZ1bmN0aW9uKGV2LCBpbmZvKSB7XG5cdFx0XHRcdFx0XHRjb25zdCB7cm9vdERpciwgZmlsZU5hbWUgfSA9IGluZm9cblx0XHRcdFx0XHRcdGNvbnN0IGZpbGVzID0gJCh0aGlzKS5pZmFjZSgpLmdldEZpbGVzKClcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbGVzJywgZmlsZXMpXG5cdFx0XHRcdFx0XHRjb25zdCBmaXJzdElkeCA9IGZpbGVzLmZpbmRJbmRleCgoZikgPT4gZi5uYW1lID09IGZpbGVOYW1lKVxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlyc3RJZHgnLCBmaXJzdElkeClcblx0XHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdwbGF5ZXInLCB7XG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnUGxheWVyJyxcblx0XHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0XHRmaXJzdElkeCxcblx0XHRcdFx0XHRcdFx0XHRmaWxlcyxcblx0XHRcdFx0XHRcdFx0XHRyb290RGlyLFxuXHRcdFx0XHRcdFx0XHRcdGZyaWVuZFVzZXJcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSlcblx0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XHRcblx0XHRcdH0pXHRcdFx0XHRcblxuXHRcdH1cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25Ib21lOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRvcGVuRmlsZVBhZ2UoJ0hvbWUgZmlsZXMnLCAnJylcblx0XHRcdFx0fSxcblx0XHRcdFx0b25TaGFyZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmZyaWVuZHMnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ1NoYXJlZCBmaWxlcycsXG5cdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRzaG93Q29ubmVjdGlvblN0YXRlOiBmYWxzZVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRcdFx0XHRmcmllbmRjbGljazogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblNlbGVjdEZyaWVuZCcsIGRhdGEpXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3Qge3VzZXJOYW1lfSA9IGRhdGFcblx0XHRcdFx0XHRcdFx0XHRvcGVuRmlsZVBhZ2UodXNlck5hbWUsIHVzZXJOYW1lKVx0XHRcdFxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIoZnVuY3Rpb24oKSB7XG5cbmZ1bmN0aW9uIGdldFRpbWUoZHVyYXRpb24pIHtcblx0Y29uc3QgZCA9IG5ldyBEYXRlKGR1cmF0aW9uICogMTAwMClcblx0Y29uc3QgdiA9IGQuZ2V0TWludXRlcygpICsgZC5nZXRTZWNvbmRzKCkvMTAwXG5cdHJldHVybiB2LnRvRml4ZWQoMikucmVwbGFjZSgnLicsICc6Jylcbn1cblxuXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncGxheWVyJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRpdGxlXFxcIj5cXG5cdDxzdHJvbmc+VGl0bGU6Jm5ic3A7PC9zdHJvbmc+XFxuXHQ8c3BhbiBibi10ZXh0PVxcXCJ0aXRsZVxcXCI+PC9zcGFuPlxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblx0PGRpdj5cXG5cdFx0PGJ1dHRvbiBibi1zaG93PVxcXCIhcGxheWluZ1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblBsYXlcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWxnIGZhLXBsYXlcXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XFxuXHRcdFxcblx0XHQ8YnV0dG9uIGJuLXNob3c9XFxcInBsYXlpbmdcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25QYXVzZVxcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtbGcgZmEtcGF1c2VcXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XFxuXHRcdFxcblx0XHQ8YnV0dG9uIGJuLXByb3A9XFxcInByb3AxXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uUHJldlxcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtbGcgZmEtc3RlcC1iYWNrd2FyZFxcXCI+PC9pPlxcblx0XHQ8L2J1dHRvbj5cXG5cdFx0XFxuXHRcdDxidXR0b24gYm4tcHJvcD1cXFwicHJvcDJcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25OZXh0XFxcIiBjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1sZyBmYS1zdGVwLWZvcndhcmRcXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XHRcdFxcblx0PC9kaXY+XFxuXFxuXFxuXHQ8ZGl2IGNsYXNzPVxcXCJzaHVmZmxlXFxcIj5cXG5cdFx0PHNwYW4+U2h1ZmZsZTwvc3Bhbj5cXG5cdFx0PGRpdiBcXG5cdFx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmZsaXBzd2l0Y2hcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImZsaXBzd2l0Y2hjaGFuZ2U6IG9uU2h1ZmZsZUNoYW5nZVxcXCJcXG5cdFx0XHRkYXRhLXdpZHRoPVxcXCIxMDBcXFwiXFxuXHRcdFx0ZGF0YS1oZWlnaHQ9XFxcIjI1XFxcIlxcblx0XHRcdD5cXG5cdFx0XHRcXG5cdFx0PC9kaXY+XHRcdFx0XFxuXHQ8L2Rpdj5cXG5cXG5cXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJzbGlkZXJcXFwiPlxcblx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0VGltZUluZm9cXFwiPjwvc3Bhbj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5zbGlkZXJcXFwiIFxcblx0XHRibi1kYXRhPVxcXCJ7bWF4OiBkdXJhdGlvbn1cXFwiXFxuXHRcdGJuLWV2ZW50PVxcXCJpbnB1dDogb25TbGlkZXJDaGFuZ2VcXFwiIFx0XHQgXFxuXHRcdGJuLXZhbD1cXFwiY3VyVGltZVxcXCI+XHRcdFxcblx0PC9kaXY+XFxuXHRcXG48L2Rpdj5cXG5cXG48YXVkaW8gXFxuXHRibi1hdHRyPVxcXCJ7c3JjfVxcXCIgXFxuXHRibi1iaW5kPVxcXCJhdWRpb1xcXCJcXG5cdGF1dG9wbGF5PVxcXCJcXFwiIFxcblx0Ym4tZXZlbnQ9XFxcImNhbnBsYXk6IG9uTG9hZCwgdGltZXVwZGF0ZTogb25UaW1lVXBkYXRlLCBwbGF5aW5nOiBvblBsYXlpbmcsIHBhdXNlOiBvblBhdXNlZCwgZW5kZWQ6IG9uRW5kZWRcXFwiPlx0XHRcXG48L2F1ZGlvPlxcblwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHRcdHJvb3REaXI6ICcnLFxuXHRcdGZpbGVzOiBbXSxcblx0XHRmaXJzdElkeDogMCxcblx0XHRmcmllbmRVc2VyOiAnJ1xuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgZmlsZXNTcnYsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCB7cm9vdERpciwgZmlsZXMsIGZpcnN0SWR4LCBmcmllbmRVc2VyfSA9IHRoaXMucHJvcHNcblxuXHRcdGxldCBzaHVmZmxlSW5kZXhlcyA9IG51bGxcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0aWR4OiBmaXJzdElkeCxcblx0XHRcdFx0bmJGaWxlczogZmlsZXMubGVuZ3RoLFxuXHRcdFx0XHRzcmM6IGdldEZpbGVVcmwoZmlyc3RJZHgpLFxuXHRcdFx0XHR0aXRsZTogZ2V0VGl0bGUoZmlyc3RJZHgpLFxuXHRcdFx0XHRkdXJhdGlvbjogMCxcblx0XHRcdFx0Y3VyVGltZTogMCxcblx0XHRcdFx0cGxheWluZzogZmFsc2UsXG5cdFx0XHRcdHByb3AxOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4ge2Rpc2FibGVkOiAhKHRoaXMuaWR4ID4gMCl9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHByb3AyOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4ge2Rpc2FibGVkOiAhKHRoaXMuaWR4IDwgdGhpcy5uYkZpbGVzIC0gMSl9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdldFRpbWVJbmZvOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gYCR7Z2V0VGltZSh0aGlzLmN1clRpbWUpfSAvICR7Z2V0VGltZSh0aGlzLmR1cmF0aW9uKX1gXG5cdFx0XHRcdH1cblxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkxvYWQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2R1cmF0aW9uJywgdGhpcy5kdXJhdGlvbilcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe2R1cmF0aW9uOiBNYXRoLmZsb29yKHRoaXMuZHVyYXRpb24pfSlcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvblRpbWVVcGRhdGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7Y3VyVGltZTogdGhpcy5jdXJyZW50VGltZX0pXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25QbGF5aW5nOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblBsYXlpbmcnKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7cGxheWluZzogdHJ1ZX0pXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25QYXVzZWQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uUGF1c2VkJylcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3BsYXlpbmc6IGZhbHNlfSlcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvblBsYXk6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGF1ZGlvLnBsYXkoKVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uUGF1c2U6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGF1ZGlvLnBhdXNlKClcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvblNsaWRlckNoYW5nZTogZnVuY3Rpb24oZXYsIHZhbHVlKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25TbGlkZXJDaGFuZ2UnLCB2YWx1ZSlcblx0XHRcdFx0XHRhdWRpby5jdXJyZW50VGltZSA9IHZhbHVlXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25TaHVmZmxlQ2hhbmdlOiBmdW5jdGlvbihldiwgdmFsdWUpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblNodWZmbGVDaGFuZ2UnLCB2YWx1ZSlcblx0XHRcdFx0XHRpZiAodmFsdWUgPT0gJ09OJykge1xuXHRcdFx0XHRcdFx0c2h1ZmZsZUluZGV4ZXMgPSBrbnV0aFNodWZmbGUoY3RybC5tb2RlbC5uYkZpbGVzKVxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnc2h1ZmZsZUluZGV4ZXMnLCBzaHVmZmxlSW5kZXhlcylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRzaHVmZmxlSW5kZXhlcyA9IG51bGxcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25FbmRlZDogbmV4dCxcblxuXHRcdFx0XHRvblByZXY6IHByZXYsXG5cblx0XHRcdFx0b25OZXh0OiBuZXh0XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0ZnVuY3Rpb24gcHJldigpIHtcblx0XHRcdGxldCB7aWR4fSA9IGN0cmwubW9kZWxcblx0XHRcdGlmIChpZHggPiAwKSB7XG5cdFx0XHRcdHNldEluZGV4KGlkeC0xKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIG5leHQoKSB7XG5cdFx0XHRpZiAoc2h1ZmZsZUluZGV4ZXMgIT0gbnVsbCkge1xuXHRcdFx0XHRpZiAoc2h1ZmZsZUluZGV4ZXMubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdHNldEluZGV4KHNodWZmbGVJbmRleGVzLnBvcCgpKVxuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXG5cdFx0XHRsZXQge2lkeCwgbmJGaWxlc30gPSBjdHJsLm1vZGVsXG5cdFx0XHRpZiAoaWR4IDwgbmJGaWxlcyAtIDEpIHtcblx0XHRcdFx0c2V0SW5kZXgoaWR4KzEpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2V0SW5kZXgoaWR4KSB7XG5cdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRzcmM6IGdldEZpbGVVcmwoaWR4KSxcblx0XHRcdFx0dGl0bGU6IGdldFRpdGxlKGlkeCksXG5cdFx0XHRcdGlkeFxuXHRcdFx0fSlcdFx0XHRcdFx0XHRcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBrbnV0aFNodWZmbGUobGVuZ3RoKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdrbnV0aFNodWZmbGUnLCBsZW5ndGgpXG5cdFx0XHRsZXQgYXJyID0gW11cblx0XHRcdGZvcihsZXQgayA9IDA7IGsgPCBsZW5ndGg7IGsrKykge1xuXHRcdFx0XHRhcnIucHVzaChrKVxuXHRcdFx0fVxuXG5cdFx0ICAgIHZhciByYW5kLCB0ZW1wLCBpO1xuXHRcdCBcblx0XHQgICAgZm9yIChpID0gYXJyLmxlbmd0aCAtIDE7IGkgPiAwOyBpIC09IDEpIHtcblx0XHQgICAgICAgIHJhbmQgPSBNYXRoLmZsb29yKChpICsgMSkgKiBNYXRoLnJhbmRvbSgpKTsvL2dldCByYW5kb20gYmV0d2VlbiB6ZXJvIGFuZCBpIChpbmNsdXNpdmUpXG5cdFx0ICAgICAgICB0ZW1wID0gYXJyW3JhbmRdOy8vc3dhcCBpIGFuZCB0aGUgemVyby1pbmRleGVkIG51bWJlclxuXHRcdCAgICAgICAgYXJyW3JhbmRdID0gYXJyW2ldO1xuXHRcdCAgICAgICAgYXJyW2ldID0gdGVtcDtcblx0XHQgICAgfVxuXHRcdCAgICByZXR1cm4gYXJyO1xuXHRcdH1cdFx0XG5cblxuXHRcdGNvbnN0IGF1ZGlvID0gY3RybC5zY29wZS5hdWRpby5nZXQoMClcblxuXHRcdGZ1bmN0aW9uIGdldFRpdGxlKGlkeCkge1xuXHRcdFx0cmV0dXJuIGZpbGVzW2lkeF0ubmFtZVxuXHRcdH1cblxuXG5cdFx0ZnVuY3Rpb24gZ2V0RmlsZVVybChpZHgpIHtcblx0XHRcdHJldHVybiBmaWxlc1Nydi5maWxlVXJsKHJvb3REaXIgKyBmaWxlc1tpZHhdLm5hbWUsIGZyaWVuZFVzZXIpXG5cdFx0fVxuXG5cblxuXHR9XG5cblxufSk7XG5cbn0pKCk7XG5cblxuXG4iXX0=
