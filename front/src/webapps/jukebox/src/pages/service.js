//@ts-check

$$.service.registerService('app.jukebox', {
    deps: ['breizbot.http', 'breizbot.playlists'],
    /**
     * 
     * @param {Breizbot.Services.Http.Interface} http 
     * @param {Breizbot.Services.Playlists.Interface} srvPlaylists
     * @returns 
     */
    init(config, http, srvPlaylists) {
        return {
             getPlaylist: function() {
                return srvPlaylists.getPlaylist()
            },
    
            getPlaylistSongs: function(name) {
                return srvPlaylists.getPlaylistSongs(name)
            },

            swapSongIndex: function(id1, id2) {
                return http.post('/swapSongIndex', {id1, id2})
            },

            removePlaylist: function(name) {
                return http.post('/removePlaylist', { name })
            },

            removeSong: function(songId) {
                return http.delete('/removeSong/' + songId)
            },

            addSong: function(name, fileInfo, checkExists) {
                return http.post('/addSong', { name, fileInfo, checkExists })

            },

            saveInfo(filePath, friendUser, tags) {
                return http.post('/saveInfo', {filePath, friendUser, tags})         
            }

        }
    }
})