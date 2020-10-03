$$.service.registerService('breizbot.wakelock', {

    init: function (config) {

        async function requestWakeLock() {
            if (navigator.wakeLock) {

                try {
                    const lock = await navigator.wakeLock.request('screen')
                    //console.log('take wakeLock')
                    lock.addEventListener('release', () => {
                        //console.log('Wake Lock was released')
                    })

                }
                catch (e) {
                    console.error('WakeLock', e)
                }

            }
        }

        function onVisibilityChange() {
            //console.log('visibilitychange', document.visibilityState)
            if (document.visibilityState === 'visible') {
                requestWakeLock()
            }
        }

        document.addEventListener('visibilitychange', onVisibilityChange)

        return {
            requestWakeLock
        }
    },
    $iface: `
        async requestWakeLock()
	`
});
