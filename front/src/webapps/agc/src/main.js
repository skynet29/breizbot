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

		window.agc = agc

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
					else { // PRO key
						agc.writeIo(0o32, 0, agc.inputsMask.PROCEED)
						setTimeout(() => {
							agc.writeIo(0o32, agc.inputsMask.PROCEED, agc.inputsMask.PROCEED)
						}, 200)
					}
				},
				onLaunch: function () {
					console.log('onLaunch')
					if (cutoff || liftoff) return
					agc.writeIo(0o30, 0, agc.inputsMask.LIFTOFF)
					phase0 = phase
					imu.setReactor(0)

					liftoff = true
				},
				onSimuRotate: function(ev, data) {
					console.log('onSimuRotate', data)
					imu.rotate(data)
				},

				onSimuAccelerate: function(ev, data) {
					console.log('onSimuAccelerate', data)
					imu.accelerate(data)
				}
			}
		})


		/**@type {AppAgc.Controls.DSKY.Interface} */
		const dsky = ctrl.scope.dsky

		/**@type {AppAgc.Controls.IMU.Interface} */
		const imu = ctrl.scope.imu

		/**@type {AppAgc.Controls.SIMU.Interface} */
		const simu = ctrl.scope.simu

		const DEG_TO_RAD = (Math.PI / 180)

		let profile = null
		let phase = 0
		let phase0 = -1
		let cutoff = false
		let liftoff = false


		async function init() {

			profile = await http.get(files.assetsUrl('profile.json'))
			//console.log('profile', profile)
			await agc.loadRom(files.assetsUrl('Comanche055.bin'))
			agc.reset()
			agc.on('channelUpdate', (ev) => {
				//console.log('channelUpdate', ev)
				// see https://www.ibiblio.org/apollo/developer.html#Table_of_IO_Channels
				const { channel, value } = ev
				switch (channel) {
					case 0o10:
						dsky.process(channel, value)
						break
					case 0o12:
						console.log('channelUpdate', channel.toString(8), value.toString(2).padStart(15, 0))
						if (value & agc.outputsMask.ZERO_IMU) {
							imu.zero();
						}
						break;
					case 0o174:
					case 0o175:
					case 0o176:
						imu.gyro_coarse_align(channel, value);
						break;
					case 0o177:
						imu.gyro_fine_align(channel, value);
						break;

				}
			})
			agc.on('lightsUpdate', (lamps) => {
				dsky.processLights(lamps)
			})
			agc.start()


			setInterval(() => {
				imu.setSt(Math.round(phase / 10))
				agc.loop()

				if (liftoff) {
					const t = Math.round((phase - phase0) / 10)
					imu.setMet(t)
					if (cutoff || t >= profile.length) {
						cutoff = true;
						liftoff = false;
						return;
					}
					//console.log('t', t)
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

					if ((phase % 10) == 0) {
						imu.update();
					}

					if (profile[t][4]) {
						const c = Math.round(profile[t][4])
						imu.setReactor(c)
					}
				}
				phase++
				agc.readAllIo()

			}, 100)

			// setInterval(function () {

			// 	agc.loop()


			// }, 1000 / 60)


		}

		init()
		simu.dynamic_simulation()

	}


})







