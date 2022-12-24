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
					console.log({firstIdx})
					pager.pushPage('player', {
						title: 'Player',
						props: {
							files: ctrl.model.songs,
							isDatabaseSongs: true,
							firstIdx
						}
					})
				}
			}
		})

        this.getButtons = function () {
            return {	
                play: {
                    title: 'Play',
                    icon: 'fa fa-play',
                    onClick: function () {
                        pager.pushPage('player', {
                            title: 'Player',
                            props: {
                                files: ctrl.model.songs,
								isDatabaseSongs: true
                            }
                        })
                    }

                }				
			}
		}	

	}


});




