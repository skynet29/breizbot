//@ts-check

$$.service.registerService('app.jukebox', {
    deps: ['breizbot.http'],
    /**
     * 
     * @param {Breizbot.Services.Http.Interface} http 
     * @returns 
     */
    init(config, http) {
        return {
             getPlaylist: function() {
                //console.log('getPlaylist')
                return http.post('/getPlaylist')
                //console.log('playlist', playlist)
            },
    
            getPlaylistSongs: function(name) {
                return http.post('/getPlaylistSongs', { name })
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