//@ts-check
$$.service.registerService('app.folder', {

    deps: ['breizbot.http', 'breizbot.broker'],

    /**
     * 
     * @param {*} config 
     * @param {Breizbot.Services.Http.Interface} http 
     * @param {Breizbot.Services.Broker.Interface} broker 
     * @returns 
     */
    init: function (config, http, broker) {

		let srcId

		broker.on('ready', (msg) => { srcId = msg.clientId})

        return {
            removeFiles: function (fileNames) {
                console.log('[FileService] removeFiles', fileNames)
                return http.post('/delete', fileNames)
            },

            mkdir: function (fileName) {
                console.log('[FileService] mkdir', fileName)
                return http.post('/mkdir', { fileName })
            },

            moveFiles: function (fileNames, destPath) {
                console.log('[FileService] moveFiles', fileNames, destPath)
                return http.post('/move', { fileNames, destPath })
            },

            shareFiles: function (fileNames, groupName) {
                console.log('[FileService] shareFiles', fileNames)
                return http.post('/move', { fileNames, destPath: `/share/${groupName}` })
            },

            copyFiles: function (fileNames, destPath) {
                console.log('[FileService] copyFiles', fileNames, destPath)
                return http.post('/copy', { fileNames, destPath })
            },

            renameFile: function (filePath, oldFileName, newFileName) {
                console.log('[FileService] renameFile', filePath, oldFileName, newFileName)
                return http.post('/rename', { filePath, oldFileName, newFileName })
            },

            resizeImage: function (filePath, fileName, resizeFormat) {
                console.log('[FileService] resizeImage', filePath, fileName, resizeFormat)
                return http.post('/resizeImage', { filePath, fileName, resizeFormat })
            },

            convertToMP3: function (filePath, fileName) {
                console.log('[FileService] convertToMP3', filePath, fileName)
                return http.post('/convertToMP3', { filePath, fileName, srcId })
            },

            zipFolder: function (folderPath, folderName) {
                console.log('[FileService] zipFolder', folderPath, folderName)
                return http.post('/zipFolder', { folderPath, folderName, srcId })
            },

            unzipFile: function (folderPath, fileName) {
                console.log('[FileService] unzipFile', folderPath, fileName)
                return http.post('/unzipFile', { folderPath, fileName, srcId })
            },

            importUrl: function(folderPath, url) {
                console.log('[FileService] importUrl', folderPath, url)
                return http.post('/importUrl', { folderPath, srcId, url })

            }

        }
    }

});
