$$.service.registerService('breizbot.fullscreen', {

    init: function (config) {


        function init(callback) {
            document.addEventListener("webkitfullscreenchange", e => {
                //console.log('webkitfullscreenchange')                
                callback(document.fullscreenElement != null)
            })

            document.addEventListener("fullscreenchange", e => {
                //console.log('fullscreenchange')
                callback(document.fullscreenElement != null)
            })

            document.addEventListener("keydown", e => {
                //console.log('keydown', e.key)
                if (e.key == "F11") {
                    e.preventDefault()
                } 
            })
        }

        function enter() {
            const elem = document.documentElement
            const requestFullscreen = elem.requestFullscreen ||
                elem.webkitRequestFullscreen

            if (requestFullscreen) {
                requestFullscreen.call(elem)
            }

        }

        function exit() {
            document.exitFullscreen()
        }



        return {
            init,
            enter,
            exit
        }
    },
    $iface: `
        init(callback(isFullScreen))
        enter()
        exit()
	`
});
