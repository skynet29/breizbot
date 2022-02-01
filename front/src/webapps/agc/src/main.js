// @ts-check



$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.files', 'app.emuAgc', 'brainjs.http'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Files.Interface} files
	 * @param {AppAgc.Services.Interface} agc
	 * @param {Brainjs.Services.Http.Interface} http
	 */
	init: function (elt, files, agc, http) {


		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onKey: function (ev, data) {
					//console.log('onKey', data)
					const { val } = data
					if (!isNaN(val)) {
						agc.writeIo(0o15, val)
					}
				},
				onLaunch: function () {
					console.log('onLaunch')
					if (cutoff || liftoff) return
					agc.writeIo(24, 0, 0x10)
					phase0 = phase
					imu.setReactor(0)

					liftoff = true
				}
			}
		})


		/**@type {AppAgc.Controls.DSKY.Interface} */
		const dsky = ctrl.scope.dsky

		/**@type {AppAgc.Controls.IMU.Interface} */
		const imu = ctrl.scope.imu

		const DEG_TO_RAD = (Math.PI / 180)

		let profile = null
		let phase = 0
		let phase0 = -1
		let cutoff = false
		let liftoff = false


		async function init() {

			profile = await http.get(files.assetsUrl('profile.json'))
			//console.log('profile', profile)
			await agc.loadRom(files.assetsUrl('agc.data'))
			//await agc.loadRom(files.assetsUrl('Comanche055.bin'))
			agc.reset()
			agc.on('channelUpdate', (ev) => {
				//console.log('channelUpdate', ev)
				const { channel, value } = ev
				switch (channel) {
					case 8:
					case 9:
					case 11:
						dsky.process(channel, value)
						break
					case 10:
						if (value & 0x0010) {
							imu.zero();
						}
						break;
					case 124:           // 0174
					case 125:           // 0175
					case 126:           // 0176
						imu.gyro_coarse_align(channel, value);
						break;
					case 127:           // 0177
						imu.gyro_fine_align(channel, value);
						break;

				}
			})
			agc.on('lightsUpdate', (lamps) => {
				dsky.processLights(lamps)
			})
			agc.start()


			let start = performance.now()

	

			setInterval(function () {

				agc.loop()
				if (performance.now() - start >= 100) {
					start = performance.now()
					let t

					if (phase % 10 === 0) {
						imu.setSt(Math.round(phase / 10))

						if (phase0 >= 0) {
							t = Math.round((phase - phase0)/10) // mission elapsed time
							imu.setMet(t)
						}
					}
					phase++;
					if (liftoff) {
						if (cutoff || t >= profile.length) {
							cutoff = true;
							liftoff = false;
							return;
						}
						imu.accelerate([
							1.08 * profile[t][2],
							0,
							0
						]);
						imu.rotate([
							-profile[t][3] / 10 * DEG_TO_RAD,
							-profile[t][1] / 10 * DEG_TO_RAD,
							0
						]);
						if (!(phase % 10)) {
							imu.update();
						}
						if (profile[t][4]) {
							const c = Math.round(profile[t][4])
							imu.setReactor(c)
						}
					}

				}


			}, 1000 / 60)

			// setInterval(()=> {
			// }, 100)

		}

		imu.update()

		init()

	}


})







