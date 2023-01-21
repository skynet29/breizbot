// @ts-check

$$.control.registerControl('databaseSongs', {

	template: { gulp_inject: './databaseSongs.html' },

	deps: ['breizbot.pager'],

	props: {
		songs: []
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, pager) {

		const {songs} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				songs
			},
			events: {
				onItemClick: function() {
					const firstIdx = $(this).index()
					launchPlayer(firstIdx)
				}
			}
		})

		function launchPlayer(firstIdx = 0) {
			//console.log('launchPlayer', firstIdx)
			pager.pushPage('player', {
				title: 'Player',
				props: {
					firstIdx,
					canAddToPlaylist: true,
					files: ctrl.model.songs.map(e => {
						return {
							rootDir: $$.path.getDirName(e.fileName),
							fileName: $$.path.getFileName(e.fileName),
							mp3: {
								artist: e.artist,
								title: e.title
							}
						}
					})
				}
			})			
		}

        this.getButtons = function () {
            return {	
                play: {
                    title: 'Play',
                    icon: 'fa fa-play',
                    onClick: function () {
                        launchPlayer()
                    }

                }				
			}
		}	

	}


});




