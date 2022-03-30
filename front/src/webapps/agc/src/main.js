// @ts-check


$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.files', 'app.emuAgc', 'app.imu', 'brainjs.http'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Files.Interface} files
	 * @param {AppAgc.Services.AGC.Interface} agc
	 * @param {AppAgc.Services.IMU.Interface} imu
	 * @param {Brainjs.Services.Http.Interface} http
	 */
	init: function (elt, files, agc, imu, http) {

		window.agc = agc

		const bit = agc.bit

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
				onSimuData: function (ev, data) {
					//console.log('onSimuData', data)
					const { rotate, accelerate } = data
					if (rotate) {
						imu.Transform_BodyAxes_StableMember(rotate)
					}
					if (accelerate) {
						imu.modify_pipaXYZ(accelerate)
					}

					if (data.omega) {
						omega = data.omega
					}

				},
				onFdaiData: function (ev, data) {
					//console.log('FDAI DATA', data)
					simu.setData(data)
				}

			}
		})


		/**@type {AppAgc.Controls.DSKY.Interface} */
		const dsky = ctrl.scope.dsky

		/**@type {AppAgc.Controls.SIMU.Interface} */
		const simu = ctrl.scope.simu

		/**@type {AppAgc.Controls.FDAI.Interface} */
		const fdai = ctrl.scope.fdai

		/**@type {AppAgc.Controls.OUTPUT.Interface} */
		const output = ctrl.scope.output

		let imuData = null
		let omega = [0, 0, 0]

		imu.on('data', (data) => {
			//console.log('imuData', data)
			imuData = data
		})


		async function init() {

			//profile = await http.get(files.assetsUrl('profile.json'))
			//console.log('profile', profile)
			await agc.loadRom(files.assetsUrl('LMY99R0.bin'))
			agc.start()

			let Delta_Time2 = 0
			let Delta_Time4 = 0
			let Delta_Time3 = 0
			let Simulation_Timer_Init = Date.now()
			let Simulation_Timer = 0
			let zeit = 0
			let JET_FLAG = false
			let flash_flag = false
			let zero = false
			let jetFiring = new Array(16).fill(0)

			setInterval(() => {
				agc.run()
			}, 10)

			function loop() {
				const data = agc.readIo()
				//console.log('data', data)
				if (data != null) {
					const { channel, value } = data

					if ([0o13, 0o14].includes(channel)) {
						output.update()
					}

					switch (channel) {
						case 0o10:
						case 0o11:
						case 0o13:
							dsky.process(channel, value)
							break
						case 0o12:
							//console.log('channelUpdate', channel.toString(8), value.toString(2).padStart(15, '0'))
							if (bit(value, 5) && !zero) {
								imu.zero()
								zero = true
							}
							else if (!bit(value, 5) && zero) {
								zero = false
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
							output.update()
							jetFiring = getJetFiring()
							JET_FLAG = jetFiring.includes(1)

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
					if (JET_FLAG) {
						simu.update_RCS(jetFiring, Delta_Time / 1000)
						zeit = 5
					}

					if (Delta_Time2 > 25) {
						simu.setData({ Simulation_Timer: Simulation_Timer / 1000 })

						simu.dynamic_simulation(Delta_Time2 / 1000)
						Delta_Time2 = 0
					}
					if (Delta_Time4 > 100) {
						if (imuData != null) {
							const { imu_angle, error } = imuData
							fdai.update(imu_angle, error, omega)
						}
						Delta_Time4 = 0
					}
					if (Delta_Time3 > 300) {
						flash_flag = !flash_flag
						dsky.setData({ flash_flag })
						Delta_Time3 = 0
					}
					setTimeout(loop, zeit)
				}
			}

			loop()

			function getJetFiring() {
				const ret = []
				for (let i = 1; i <= 8; i++) {
					ret.push(agc.getChannelBitState(0o5, i))
				}
				for (let i = 1; i <= 8; i++) {
					ret.push(agc.getChannelBitState(0o6, i))
				}
				return ret
			}



		}

		init()

	}


})







