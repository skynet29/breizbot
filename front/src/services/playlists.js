//@ts-check

$$.service.registerService('breizbot.playlists', {

	deps: ['brainjs.resource'],

	init: function (config, resource) {

		const http = resource('/api/playlists')

		return {

			getPlaylist: function () {
				return http.post(`/getPlaylist`)
			},

			getPlaylistSongs: function (name) {
				return http.post(`/getPlaylistSongs`, {name})
			}
			
		}
	}
});
