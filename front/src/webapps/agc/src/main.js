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
						agc.writeIoBit(0o32, 14, 0)
						setTimeout(() => {
							agc.writeIoBit(0o32, 14, 1)
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
				onSimuData: function (ev, data) {
					//console.log('onSimuData', data)
					const {rotate, accelerate, omega} = data
					if (rotate) {
						imu.rotate(rotate)
					}
					if (accelerate) {
						imu.accelerate(accelerate)
					}
					
				},

				onSimuAccelerate: function (ev, data) {
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
			agc.start()

			let Delta_Time2 = 0
			let Delta_Time4 = 0
			let Delta_Time3 = 0
			let Simulation_Timer_Init = Date.now()
			let Simulation_Timer = 0
			let zeit = 0
			let JET_FLAG = 0
			let flash_flag = false

			setInterval(() => {
				agc.run()
			}, 10)

			function loop() {
				const data = agc.readIo()
				//console.log('data', data)
				if (data != null) {
					const { channel, value } = data

					switch (channel) {
						case 0o10:
						case 0o11:
						case 0x13:
							dsky.process(channel, value)
							break
						case 0o12:
							console.log('channelUpdate', channel.toString(8), value.toString(2).padStart(15, '0'))
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
						case 0o5:
						case 0o6:

							break
					}
					loop()
				}
				else {
					const t = Date.now()
					const Delta_Time = t - Simulation_Timer_Init
					Delta_Time2 += Delta_Time
					Delta_Time4 += Delta_Time
					Delta_Time3 += Delta_Time
					Simulation_Timer += Delta_Time
					Simulation_Timer_Init = t
					//console.log({ Delta_Time2, Delta_Time4 })
					zeit = 10
					if (JET_FLAG == 1) {
						simu.update_RCS(Delta_Time / 1000)
						zeit = 5
					}

					if (Delta_Time2 > 25) {
						simu.setData({Simulation_Timer: Simulation_Timer/1000})

						simu.dynamic_simulation(Delta_Time2 / 1000)
						Delta_Time2 = 0
					}
					if (Delta_Time4 > 100) {
						imu.update()
						Delta_Time4 = 0
					}
					if (Delta_Time3 > 300) {
						flash_flag = !flash_flag
						dsky.setData({flash_flag})
						Delta_Time3 = 0
					}
					setTimeout(loop, zeit)
				}
			}

			loop()

			/*


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
			*/



		}

		init()
		//simu.dynamic_simulation()

	}


})







