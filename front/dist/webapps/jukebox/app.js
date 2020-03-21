$$.control.registerControl('files', {

	template: "<div \n	bn-control=\"breizbot.files\" \n	bn-data=\"{filterExtension: \'.mp3\', friendUser}\"\n	bn-event=\"fileclick: onFileClick\"\n	bn-iface=\"files\"\n	></div>",

	deps: ['breizbot.pager'],

	props: {
		friendUser: ''
	},


	init: function(elt, pager) {

		const {friendUser} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				friendUser
			},
			events: {
				onFileClick: function(ev, data) {
					//console.log('onFileClick', data)
					const {rootDir, fileName } = data
					const files = ctrl.scope.files.getFiles()
					//console.log('files', files)
					const firstIdx = files.findIndex((f) => f.name == fileName)
					//console.log('firstIdx', firstIdx)
					pager.pushPage('player', {
						title: 'Diaporama',
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


});





$$.control.registerControl('friends', {

	template: "<p>Select a friends</p>\n<div \n	bn-control=\"breizbot.friends\" \n	bn-event=\"friendclick: onSelectFriend\"\n	bn-data=\"{showConnectionState: false}\"\n	></div>",

	deps: ['breizbot.pager'],

	init: function(elt, pager) {

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onSelectFriend: function(ev, data) {
					console.log('onSelectFriend', data)
					const {userName} = data
					pager.pushPage('files', {
						title: userName,
						props: {
							friendUser: userName
						}
					})
				}				
			}
		})	

	}
});
$$.control.registerControl('rootPage', {

	template: "<p>Select a file system</p>\n\n<ul class=\"w3-ul w3-border w3-white\">\n	<li class=\"w3-bar\" bn-event=\"click: onHome\">\n		<div class=\"w3-bar-item\">\n			<i class=\"fa fa-home fa-2x fa-fw w3-text-blue\"></i>\n			<span>Your home files</span>\n		</div>\n	</li>\n\n	<li class=\"w3-bar\" bn-event=\"click: onShare\">\n		<div class=\"w3-bar-item\">\n			<i class=\"fa fa-share-alt fa-2x fa-fw w3-text-blue\"></i>\n			<span>Files shared by your friends</span>\n		</div>\n	</li>\n</ul>	",

	deps: ['breizbot.pager'],

	init: function(elt, pager) {

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onHome: function() {
					console.log('onHome')
					pager.pushPage('files', {
						title: 'Home files'					
					})
				},
				onShare: function() {
					console.log('onShare')
					pager.pushPage('friends', {
						title: 'Shared files'					
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




//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGVzLmpzIiwiZnJpZW5kcy5qcyIsIm1haW4uanMiLCJwbGF5ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2ZpbGVzJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgXFxuXHRibi1jb250cm9sPVxcXCJicmVpemJvdC5maWxlc1xcXCIgXFxuXHRibi1kYXRhPVxcXCJ7ZmlsdGVyRXh0ZW5zaW9uOiBcXCcubXAzXFwnLCBmcmllbmRVc2VyfVxcXCJcXG5cdGJuLWV2ZW50PVxcXCJmaWxlY2xpY2s6IG9uRmlsZUNsaWNrXFxcIlxcblx0Ym4taWZhY2U9XFxcImZpbGVzXFxcIlxcblx0PjwvZGl2PlwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHRcdGZyaWVuZFVzZXI6ICcnXG5cdH0sXG5cblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCB7ZnJpZW5kVXNlcn0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGZyaWVuZFVzZXJcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25GaWxlQ2xpY2s6IGZ1bmN0aW9uKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25GaWxlQ2xpY2snLCBkYXRhKVxuXHRcdFx0XHRcdGNvbnN0IHtyb290RGlyLCBmaWxlTmFtZSB9ID0gZGF0YVxuXHRcdFx0XHRcdGNvbnN0IGZpbGVzID0gY3RybC5zY29wZS5maWxlcy5nZXRGaWxlcygpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlsZXMnLCBmaWxlcylcblx0XHRcdFx0XHRjb25zdCBmaXJzdElkeCA9IGZpbGVzLmZpbmRJbmRleCgoZikgPT4gZi5uYW1lID09IGZpbGVOYW1lKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpcnN0SWR4JywgZmlyc3RJZHgpXG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ3BsYXllcicsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnRGlhcG9yYW1hJyxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdGZpcnN0SWR4LFxuXHRcdFx0XHRcdFx0XHRmaWxlcyxcblx0XHRcdFx0XHRcdFx0cm9vdERpcixcblx0XHRcdFx0XHRcdFx0ZnJpZW5kVXNlclxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnZnJpZW5kcycsIHtcblxuXHR0ZW1wbGF0ZTogXCI8cD5TZWxlY3QgYSBmcmllbmRzPC9wPlxcbjxkaXYgXFxuXHRibi1jb250cm9sPVxcXCJicmVpemJvdC5mcmllbmRzXFxcIiBcXG5cdGJuLWV2ZW50PVxcXCJmcmllbmRjbGljazogb25TZWxlY3RGcmllbmRcXFwiXFxuXHRibi1kYXRhPVxcXCJ7c2hvd0Nvbm5lY3Rpb25TdGF0ZTogZmFsc2V9XFxcIlxcblx0PjwvZGl2PlwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInXSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uU2VsZWN0RnJpZW5kOiBmdW5jdGlvbihldiwgZGF0YSkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblNlbGVjdEZyaWVuZCcsIGRhdGEpXG5cdFx0XHRcdFx0Y29uc3Qge3VzZXJOYW1lfSA9IGRhdGFcblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnZmlsZXMnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogdXNlck5hbWUsXG5cdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRmcmllbmRVc2VyOiB1c2VyTmFtZVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cdFx0XHRcdFxuXHRcdFx0fVxuXHRcdH0pXHRcblxuXHR9XG59KTsiLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncm9vdFBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPHA+U2VsZWN0IGEgZmlsZSBzeXN0ZW08L3A+XFxuXFxuPHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGVcXFwiPlxcblx0PGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25Ib21lXFxcIj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1ob21lIGZhLTJ4IGZhLWZ3IHczLXRleHQtYmx1ZVxcXCI+PC9pPlxcblx0XHRcdDxzcGFuPllvdXIgaG9tZSBmaWxlczwvc3Bhbj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2xpPlxcblxcblx0PGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25TaGFyZVxcXCI+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtc2hhcmUtYWx0IGZhLTJ4IGZhLWZ3IHczLXRleHQtYmx1ZVxcXCI+PC9pPlxcblx0XHRcdDxzcGFuPkZpbGVzIHNoYXJlZCBieSB5b3VyIGZyaWVuZHM8L3NwYW4+XFxuXHRcdDwvZGl2Plxcblx0PC9saT5cXG48L3VsPlx0XCIsXG5cblx0ZGVwczogWydicmVpemJvdC5wYWdlciddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgcGFnZXIpIHtcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25Ib21lOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25Ib21lJylcblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnZmlsZXMnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ0hvbWUgZmlsZXMnXHRcdFx0XHRcdFxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uU2hhcmU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblNoYXJlJylcblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnZnJpZW5kcycsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnU2hhcmVkIGZpbGVzJ1x0XHRcdFx0XHRcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdH1cblxuXG59KTtcblxuXG5cblxuIiwiKGZ1bmN0aW9uKCkge1xuXG5mdW5jdGlvbiBnZXRUaW1lKGR1cmF0aW9uKSB7XG5cdGNvbnN0IGQgPSBuZXcgRGF0ZShkdXJhdGlvbiAqIDEwMDApXG5cdGNvbnN0IHYgPSBkLmdldE1pbnV0ZXMoKSArIGQuZ2V0U2Vjb25kcygpLzEwMFxuXHRyZXR1cm4gdi50b0ZpeGVkKDIpLnJlcGxhY2UoJy4nLCAnOicpXG59XG5cblxuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3BsYXllcicsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJ0aXRsZVxcXCI+XFxuXHQ8c3Ryb25nPlRpdGxlOiZuYnNwOzwvc3Ryb25nPlxcblx0PHNwYW4gYm4tdGV4dD1cXFwidGl0bGVcXFwiPjwvc3Bhbj5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cdDxkaXY+XFxuXHRcdDxidXR0b24gYm4tc2hvdz1cXFwiIXBsYXlpbmdcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25QbGF5XFxcIiBjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1sZyBmYS1wbGF5XFxcIj48L2k+XFxuXHRcdDwvYnV0dG9uPlxcblx0XHRcXG5cdFx0PGJ1dHRvbiBibi1zaG93PVxcXCJwbGF5aW5nXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uUGF1c2VcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWxnIGZhLXBhdXNlXFxcIj48L2k+XFxuXHRcdDwvYnV0dG9uPlxcblx0XHRcXG5cdFx0PGJ1dHRvbiBibi1wcm9wPVxcXCJwcm9wMVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblByZXZcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWxnIGZhLXN0ZXAtYmFja3dhcmRcXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XFxuXHRcdFxcblx0XHQ8YnV0dG9uIGJuLXByb3A9XFxcInByb3AyXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uTmV4dFxcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtbGcgZmEtc3RlcC1mb3J3YXJkXFxcIj48L2k+XFxuXHRcdDwvYnV0dG9uPlx0XHRcXG5cdDwvZGl2Plxcblxcblxcblx0PGRpdiBjbGFzcz1cXFwic2h1ZmZsZVxcXCI+XFxuXHRcdDxzcGFuPlNodWZmbGU8L3NwYW4+XFxuXHRcdDxkaXYgXFxuXHRcdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy5mbGlwc3dpdGNoXFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJmbGlwc3dpdGNoY2hhbmdlOiBvblNodWZmbGVDaGFuZ2VcXFwiXFxuXHRcdFx0ZGF0YS13aWR0aD1cXFwiMTAwXFxcIlxcblx0XHRcdGRhdGEtaGVpZ2h0PVxcXCIyNVxcXCJcXG5cdFx0XHQ+XFxuXHRcdFx0XFxuXHRcdDwvZGl2Plx0XHRcdFxcblx0PC9kaXY+XFxuXFxuXFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwic2xpZGVyXFxcIj5cXG5cdDxzcGFuIGJuLXRleHQ9XFxcImdldFRpbWVJbmZvXFxcIj48L3NwYW4+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuc2xpZGVyXFxcIiBcXG5cdFx0Ym4tZGF0YT1cXFwie21heDogZHVyYXRpb259XFxcIlxcblx0XHRibi1ldmVudD1cXFwiaW5wdXQ6IG9uU2xpZGVyQ2hhbmdlXFxcIiBcdFx0IFxcblx0XHRibi12YWw9XFxcImN1clRpbWVcXFwiPlx0XHRcXG5cdDwvZGl2Plxcblx0XFxuPC9kaXY+XFxuXFxuPGF1ZGlvIFxcblx0Ym4tYXR0cj1cXFwie3NyY31cXFwiIFxcblx0Ym4tYmluZD1cXFwiYXVkaW9cXFwiXFxuXHRhdXRvcGxheT1cXFwiXFxcIiBcXG5cdGJuLWV2ZW50PVxcXCJjYW5wbGF5OiBvbkxvYWQsIHRpbWV1cGRhdGU6IG9uVGltZVVwZGF0ZSwgcGxheWluZzogb25QbGF5aW5nLCBwYXVzZTogb25QYXVzZWQsIGVuZGVkOiBvbkVuZGVkXFxcIj5cdFx0XFxuPC9hdWRpbz5cXG5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJywgJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0cHJvcHM6IHtcblx0XHRyb290RGlyOiAnJyxcblx0XHRmaWxlczogW10sXG5cdFx0Zmlyc3RJZHg6IDAsXG5cdFx0ZnJpZW5kVXNlcjogJydcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIGZpbGVzU3J2LCBwYWdlcikge1xuXG5cdFx0Y29uc3Qge3Jvb3REaXIsIGZpbGVzLCBmaXJzdElkeCwgZnJpZW5kVXNlcn0gPSB0aGlzLnByb3BzXG5cblx0XHRsZXQgc2h1ZmZsZUluZGV4ZXMgPSBudWxsXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGlkeDogZmlyc3RJZHgsXG5cdFx0XHRcdG5iRmlsZXM6IGZpbGVzLmxlbmd0aCxcblx0XHRcdFx0c3JjOiBnZXRGaWxlVXJsKGZpcnN0SWR4KSxcblx0XHRcdFx0dGl0bGU6IGdldFRpdGxlKGZpcnN0SWR4KSxcblx0XHRcdFx0ZHVyYXRpb246IDAsXG5cdFx0XHRcdGN1clRpbWU6IDAsXG5cdFx0XHRcdHBsYXlpbmc6IGZhbHNlLFxuXHRcdFx0XHRwcm9wMTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHtkaXNhYmxlZDogISh0aGlzLmlkeCA+IDApfVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRwcm9wMjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHtkaXNhYmxlZDogISh0aGlzLmlkeCA8IHRoaXMubmJGaWxlcyAtIDEpfVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRnZXRUaW1lSW5mbzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGAke2dldFRpbWUodGhpcy5jdXJUaW1lKX0gLyAke2dldFRpbWUodGhpcy5kdXJhdGlvbil9YFxuXHRcdFx0XHR9XG5cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25Mb2FkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdkdXJhdGlvbicsIHRoaXMuZHVyYXRpb24pXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtkdXJhdGlvbjogTWF0aC5mbG9vcih0aGlzLmR1cmF0aW9uKX0pXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25UaW1lVXBkYXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe2N1clRpbWU6IHRoaXMuY3VycmVudFRpbWV9KVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uUGxheWluZzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25QbGF5aW5nJylcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3BsYXlpbmc6IHRydWV9KVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uUGF1c2VkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblBhdXNlZCcpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtwbGF5aW5nOiBmYWxzZX0pXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25QbGF5OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRhdWRpby5wbGF5KClcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvblBhdXNlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRhdWRpby5wYXVzZSgpXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25TbGlkZXJDaGFuZ2U6IGZ1bmN0aW9uKGV2LCB2YWx1ZSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uU2xpZGVyQ2hhbmdlJywgdmFsdWUpXG5cdFx0XHRcdFx0YXVkaW8uY3VycmVudFRpbWUgPSB2YWx1ZVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uU2h1ZmZsZUNoYW5nZTogZnVuY3Rpb24oZXYsIHZhbHVlKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25TaHVmZmxlQ2hhbmdlJywgdmFsdWUpXG5cdFx0XHRcdFx0aWYgKHZhbHVlID09ICdPTicpIHtcblx0XHRcdFx0XHRcdHNodWZmbGVJbmRleGVzID0ga251dGhTaHVmZmxlKGN0cmwubW9kZWwubmJGaWxlcylcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ3NodWZmbGVJbmRleGVzJywgc2h1ZmZsZUluZGV4ZXMpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0c2h1ZmZsZUluZGV4ZXMgPSBudWxsXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uRW5kZWQ6IG5leHQsXG5cblx0XHRcdFx0b25QcmV2OiBwcmV2LFxuXG5cdFx0XHRcdG9uTmV4dDogbmV4dFxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGZ1bmN0aW9uIHByZXYoKSB7XG5cdFx0XHRsZXQge2lkeH0gPSBjdHJsLm1vZGVsXG5cdFx0XHRpZiAoaWR4ID4gMCkge1xuXHRcdFx0XHRzZXRJbmRleChpZHgtMSlcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBuZXh0KCkge1xuXHRcdFx0aWYgKHNodWZmbGVJbmRleGVzICE9IG51bGwpIHtcblx0XHRcdFx0aWYgKHNodWZmbGVJbmRleGVzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRzZXRJbmRleChzaHVmZmxlSW5kZXhlcy5wb3AoKSlcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblxuXHRcdFx0bGV0IHtpZHgsIG5iRmlsZXN9ID0gY3RybC5tb2RlbFxuXHRcdFx0aWYgKGlkeCA8IG5iRmlsZXMgLSAxKSB7XG5cdFx0XHRcdHNldEluZGV4KGlkeCsxKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNldEluZGV4KGlkeCkge1xuXHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0c3JjOiBnZXRGaWxlVXJsKGlkeCksXG5cdFx0XHRcdHRpdGxlOiBnZXRUaXRsZShpZHgpLFxuXHRcdFx0XHRpZHhcblx0XHRcdH0pXHRcdFx0XHRcdFx0XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24ga251dGhTaHVmZmxlKGxlbmd0aCkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygna251dGhTaHVmZmxlJywgbGVuZ3RoKVxuXHRcdFx0bGV0IGFyciA9IFtdXG5cdFx0XHRmb3IobGV0IGsgPSAwOyBrIDwgbGVuZ3RoOyBrKyspIHtcblx0XHRcdFx0YXJyLnB1c2goaylcblx0XHRcdH1cblxuXHRcdCAgICB2YXIgcmFuZCwgdGVtcCwgaTtcblx0XHQgXG5cdFx0ICAgIGZvciAoaSA9IGFyci5sZW5ndGggLSAxOyBpID4gMDsgaSAtPSAxKSB7XG5cdFx0ICAgICAgICByYW5kID0gTWF0aC5mbG9vcigoaSArIDEpICogTWF0aC5yYW5kb20oKSk7Ly9nZXQgcmFuZG9tIGJldHdlZW4gemVybyBhbmQgaSAoaW5jbHVzaXZlKVxuXHRcdCAgICAgICAgdGVtcCA9IGFycltyYW5kXTsvL3N3YXAgaSBhbmQgdGhlIHplcm8taW5kZXhlZCBudW1iZXJcblx0XHQgICAgICAgIGFycltyYW5kXSA9IGFycltpXTtcblx0XHQgICAgICAgIGFycltpXSA9IHRlbXA7XG5cdFx0ICAgIH1cblx0XHQgICAgcmV0dXJuIGFycjtcblx0XHR9XHRcdFxuXG5cblx0XHRjb25zdCBhdWRpbyA9IGN0cmwuc2NvcGUuYXVkaW8uZ2V0KDApXG5cblx0XHRmdW5jdGlvbiBnZXRUaXRsZShpZHgpIHtcblx0XHRcdHJldHVybiBmaWxlc1tpZHhdLm5hbWVcblx0XHR9XG5cblxuXHRcdGZ1bmN0aW9uIGdldEZpbGVVcmwoaWR4KSB7XG5cdFx0XHRyZXR1cm4gZmlsZXNTcnYuZmlsZVVybChyb290RGlyICsgZmlsZXNbaWR4XS5uYW1lLCBmcmllbmRVc2VyKVxuXHRcdH1cblxuXG5cblx0fVxuXG5cbn0pO1xuXG59KSgpO1xuXG5cblxuIl19
