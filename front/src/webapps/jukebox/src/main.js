$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['breizbot.pager'],

	init: function(elt, pager) {

		function openFilterPage(iface) {
			let artists = {}
			const mp3Filters = iface.getMP3Filters()
			iface.getFiles()
				.forEach((f) => {
					if (f.mp3 && f.mp3.artist) {
						if (artists[f.mp3.artist]) {
							artists[f.mp3.artist]++
						}
						else {
							artists[f.mp3.artist] = 1
						}						
					}
				})
			artists = Object.keys(artists).map((artist) => {
				const nbTitle = artists[artist]
				return (nbTitle == 1) ?
					{value: artist, label: artist} :
					{value: artist, label: `${artist} (${nbTitle})`}
			})
			artists.unshift({value: 'All', label: 'All', style: 'font-weight: bold;'})
			pager.pushPage('filterDlg', {
				title: 'Filter',
				props: {
					artists,
					selectedArtist:  (mp3Filters && mp3Filters.artist) || 'All'
				},
				onReturn: function(artist) {
					console.log('artist', artist)
					if (artist == 'All') {
						artist = null
					}
					iface.setMP3Filters({artist})
				}
			})
		}

		function openFilePage(title, friendUser) {
			pager.pushPage('breizbot.files', {
				title,
				props: {
					filterExtension: '.mp3',
					getMP3Info: true,
					friendUser
				},
				buttons: {
					search: {
						title: 'Filter',
						icon: 'fa fa-search',
						onClick: function() {
							openFilterPage(this)
						}
					}
				},
				events: {
					fileclick: function(ev, info) {
						console.log('info', info)
						const {rootDir, fileName } = info
						const iface = $(this).iface()
						const files = iface.getFilteredFiles()
						console.log('files', files)
						const firstIdx = files.findIndex((f) => f.name == fileName)
						console.log('firstIdx', firstIdx)
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




