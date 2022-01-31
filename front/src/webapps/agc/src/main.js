// @ts-check



$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.files', 'app.emuAgc'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Files.Interface} files
	 * @param {AppAgc.Services.Interface} agc
	 */
	init: function (elt, files, agc) {


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
				}
			}
		})


		/**@type {AppAgc.Controls.DSKY.Interface} */
		const dsky = ctrl.scope.dsky

		/**@type {AppAgc.Controls.IMU.Interface} */
		const imu = ctrl.scope.imu
		console.log('imu', imu)


		let cpu_time = 0   // in seconds


		async function init() {

			await agc.loadRom(files.assetsUrl('Comanche055.bin'))
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



			setInterval(function () {

				//dsky.tick()
				cpu_time += 0.1

				agc.loop()
				//console.log(agc.peek(0o10).toString(8))

			}, 1000 / 60)

		}

		imu.update()

		init()

	}


})







