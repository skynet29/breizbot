// @ts-check


$$.control.registerControl('rootPage', {

	template: "<div>\n    <div bn-control=\"DSKY\" bn-event=\"key: onKey\" bn-iface=\"dsky\"></div>\n\n    <div bn-control=\"FDAI\" bn-iface=\"fdai\" bn-event=\"data: onFdaiData\"></div>\n\n</div>\n\n<div>\n    <div bn-control=\"INPUT\"></div>\n    <div bn-control=\"OUTPUT\" bn-iface=\"output\"></div>\n</div>\n\n<div bn-control=\"SIMU\" bn-iface=\"simu\" bn-event=\"data: onSimuData\"></div>\n\n",

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
						imu.rotate(rotate)
					}
					if (accelerate) {
						imu.accelerate(accelerate)
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
							imu.gyroCoarseAlign(channel, value);
							break;
						case 0o177:
							imu.gyroFineAlign(channel, value);
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









$$.service.registerService('app.emuAgc', {

    deps: ['breizbot.files'],

    init: function (config) {

        const set_fixed = Module.cwrap('set_fixed', null, ['number'])
        const reset = Module.cwrap('cpu_reset')
        const stepCpu = Module.cwrap('cpu_step', null, ['number'])
        const packetRead = Module.cwrap('packet_read', 'number')
        const packetWrite = Module.cwrap('packet_write', null, ['number', 'number'])
        const get_erasable_ptr = Module.cwrap('get_erasable_ptr', 'number')

        const cycleMs = 0.01172 // 11.72 microseconds per AGC instruction


        let startTime = 0
        let totalSteps = 0
        let erasablePtr = null

        const masks = {
            0o30: 0b111111111111111,
            0o31: 0b111111111111111,
            0o32: 0b010001111111111,
            0o33: 0b111111111111110

        }

        const channels = {
            0o30: 0b011110011011001,
            0o31: 0b111111111111111,
            0o32: 0b010001111111111,
            0o33: 0b101111111111110
        }

        function writeIo(channel, value, mask) {
            channel = parseInt(channel)
            // if (mask) {
            //     console.log('writeIo', channel.toString(8), value.toString(2).padStart(15, '0'),
            //      mask.toString(2).padStart(15, '0'))
            // }
            // else {
            //     console.log('writeIo', channel.toString(8), value)
            // }
            if (mask != undefined) {
                packetWrite(channel + 256, mask) // set mask bit 15
            }
            packetWrite(channel, value)
        }

        function setBit(varia, nbit, value) {
            const mask = bitMask(nbit)
            if (value == 0) {
                varia &= ~mask
            }
            else {
                varia |= mask
            }
            return varia

        }

        function writeIoBits(channel, bits) {
            let mask = 0
            let value = 0
            if (Object.keys(bits).length == 0) return
            //console.log('writeIoBits', channel.toString(8), bits)
            Object.entries(bits).forEach(([nbit, val]) => {
                mask = setBit(mask, nbit, 1)
                value = setBit(value, nbit, val)
                channels[channel] = setBit(channels[channel], nbit, val)
            })
            // console.log('mask ', mask.toString(2).padStart(15, '0'))
            // console.log('value', value.toString(2).padStart(15, '0'))
            console.log(`chan[${channel.toString(8).padStart(3, '0')}]=` + channels[channel].toString(2).padStart(15, '0'))

            writeIo(channel, value, mask)

        }

        function writeIoBit(channel, nbit, value) {
            const data = {}
            data[nbit] = value
            writeIoBits(channel, data)
        }

        function peek(offset) {
            const ret = Module.getValue(erasablePtr + offset * 2, 'i16') & 0x7fff
            //console.log('peek', {offset, ret})
            return ret
        }

        function poke(offset, value) {
            //console.log('poke', {offset, value})
            Module.setValue(erasablePtr + offset * 2, value, 'i16')
        }

        async function loadRom(url) {
            const response = await fetch(url)
            const binary = await response.arrayBuffer()

            const romArray = new Uint8Array(binary)
            console.log('romArray', romArray.length)
            const romPtr = Module._malloc(romArray.length * romArray.BYTES_PER_ELEMENT)
            console.log('romPtr', romPtr)

            Module.HEAP8.set(romArray, romPtr)
            set_fixed(romPtr)
            Module._free(romPtr)
            erasablePtr = get_erasable_ptr()
            console.log('erasablePtr', erasablePtr)
        }

        function start() {
            console.log('start')
            reset();

            setTimeout(()=>{
                Object.entries(channels).forEach(([chan, val]) => {
                    const mask = masks[chan]
                    writeIo(chan, val, mask)
                })
                
                const sets = [0o5, 0o6, 0o14]
                sets.forEach((chan) => {
                    channels[chan] = 0
                })
    
            }, 100)
            startTime = performance.now()
            totalSteps = 0

        }

        function run() {
            const targetSteps = Math.floor((performance.now() - startTime) / cycleMs)
            const diffSteps = targetSteps - totalSteps
            //console.log('diffSteps', diffSteps)
            if (diffSteps < 0 || diffSteps > 100000) {
                // No matter which cause, prevent hanging due to high step counts due to integer overflows.
                startTime = performance.now()
                totalSteps = 0
                return
            }
            stepCpu(diffSteps)
            totalSteps += diffSteps
            //readAllIo()            
        }

        function bit(val, n) {
            return (val >> (n-1)) & 1
        }

        function getChannelState(channel) {
            return channels[channel]
        }

        function logChannelState(channel) {
            const channelOctal = parseInt(channel).toString(8).padStart('3', '0')
            console.log(`channel[${channelOctal}] = ` + channels[channel].toString(2).padStart(15, '0'))
        }

        function logAllChannelState() {
            Object.keys(channels).forEach((channel) => {
                logChannelState(channel)
            })
        }

        function getChannelBitState(channel, nbit) {
            return bit(channels[channel], nbit)
        }

        function readIo() {
            let ret = null
            const data = packetRead()
            if (data) {
                const channel = data >> 16
                const value = data & 0xffff

                channels[channel] = value
                ret = { channel, value }
            }
            return ret
        }


        function bitMask(n) {
            return 1 << (n - 1)
        }

        return {
            writeIo,
            writeIoBit,
            writeIoBits,
            loadRom,
            start,
            run,
            readIo,
            peek,
            poke,
            getChannelState,
            getChannelBitState,
            bitMask,
            bit,
            logChannelState,
            logAllChannelState
        }

    }
})




$$.service.registerService('app.imu', {

    deps: ['app.emuAgc'],

    /**
     * 
     * @param {*} config 
     * @param {AppAgc.Services.AGC.Interface} agc 
     * @returns 
     */
    init: function (config, agc) {

        const event = new EventEmitter2()

		const abs = Math.abs;
		const floor = Math.floor;
		const sin = Math.sin;
		const cos = Math.cos;
		const PI = Math.PI;
		const PI2 = (2 * PI)
		const DEG_TO_RAD = (PI / 180)
		const RAD_TO_DEG = (180 / PI)

		const CA_ANGLE = 0.043948
		const FA_ANGLE = 0.617981 / 3600.0
		const ANGLE_INCR = 360.0 / 32768
		const PIPA_INCR = 0.0585; // m/s per each PIPA pulse


		let error;
		let imu_angle;
		let pimu;
		let pipa;
		let velocity;
		let gimbalLock;


		function zero() {
			console.log('zero')
			error = [0, 0, 0]
			imu_angle = [0, 0, 0]
			euler = [0, 0, 0]
			pimu = [0, 0, 0]
			omega = [0, 0, 0]
			velocity = [0, 0, 0]
			pipa = [0, 0, 0]
			gimbalLock = false

			update()

		}

		function update() {
            event.emit('data', {imu_angle, error})
		}

		function adjust(x) {
			let ret = x
			if (x < 0) x += 360
			if (x >= 360) x -=360
			return x
		}

		function adjust2(x) {
			let ret = x
			if (x < -180) x += 360
			if (x > 180) x -=360
			return x
		}

		function adjust3(x) {
			let ret = x
			if (x < -PI2) x += PI2
			if (x >= PI2) x -= PI2
			return x
		}


		//************************************************************************************************
		//*** Function: Modify a specific IMU Delta Gimbal-Angle par1=X; par2=Y; par3=Z               ****
		//************************************************************************************************
		function modifyGimbalAngle(delta) {
			if (gimbalLock) return;
			let ang_delta = 0;

			for (let axis = 0; axis < 3; axis++) {
				if (delta[axis]) {
					// ---- Calculate New Angle ----
					imu_angle[axis] = adjust(delta[axis] + imu_angle[axis])

					// ---- Calculate Delta between the new Angle and already feeded IMU Angle ----
					const dx = adjust2(imu_angle[axis] - pimu[axis])

					// ---- Feed yaAGC with the new Angular Delta ----
					const sign = dx > 0 ? +1 : -1;
					let n = floor(abs(dx) / ANGLE_INCR)
					//console.log('n', n)
					pimu[axis] = adjust(pimu[axis] + sign * ANGLE_INCR * n);

					let cdu = agc.peek(26 + axis);                        // read CDU counter (26 = 0x32 = CDUX)
					cdu = cdu & 0x4000 ? -(cdu ^ 0x7FFF) : cdu;     // converts from ones-complement to twos-complement
					cdu += sign * n;                                // adds the number of pulses 
					agc.poke(26 + axis, cdu < 0 ? (-cdu) ^ 0x7FFF : cdu);   // converts back to ones-complement and writes the counter
					// for(;n>0; n--){                
					//    agc.writeIo(0x9A+axis, sign>0 ? PCDU_FAST : MCDU_FAST, );  // 0x9A = 0232 = 0200 + 032 
					// }                  
				}
			}
			/*
			if(imu_angle[2] > 85.1*DEG_TO_RAD && imu_angle[2] < 274.9*DEG_TO_RAD){
				gimbalLock = true;                
			}
			*/
		}

		//************************************************************************************************
		//**** Function: Gyro Coarse Align (will be called in case of Channel 0174; 0175; 0176 output) ***
		//************************************************************************************************
		function gyroCoarseAlign(chan, val) {
			//console.log('gyro_coarse_align', {chan, val})
			const sign = val & 0x4000 ? -1 : +1;
			const cdu_pulses = sign * (val & 0x3FFF);

			// ---- Coarse Align Enable ----
			if (agc.getChannelBitState(0o12, 4) == 1) {    // {$bo(12,4) == 1}
				if (chan === 124) {  // 0174
					modifyGimbalAngle([cdu_pulses * CA_ANGLE, 0, 0]);
				}
				else if (chan === 125) {  // 0175
					modifyGimbalAngle([0, cdu_pulses * CA_ANGLE, 0]);
				}
				else if (chan === 126) {  // 0176
					modifyGimbalAngle([0, 0, cdu_pulses * CA_ANGLE]);
				}

				update()
			} else {
				// ---- Error Needles ----
				error[chan - 124] += cdu_pulses;
			}
		}


		//*******************************************************************************************
		//*** Function: Gyro Fine Align (will be called in case of Channel 0177 output)           ***
		//*******************************************************************************************
		function gyroFineAlign(chan, val) {
			//console.log('gyro_fine_align', chan, val)


			const gyro_sign_minus = val & 0x4000;
			const gyro_selection_a = val & 0x2000;
			const gyro_selection_b = val & 0x1000;
			const gyro_enable = val & 0x0800;
			const sign = gyro_sign_minus ? -1 : +1;
			const gyro_pulses = sign * (val & 0x07FF);

			if (!gyro_selection_a && gyro_selection_b) {
				modifyGimbalAngle([gyro_pulses * FA_ANGLE, 0, 0]);
			}
			if (gyro_selection_a && !gyro_selection_b) {
				modifyGimbalAngle([0, gyro_pulses * FA_ANGLE, 0]);
			}
			if (gyro_selection_a && gyro_selection_b) {
				modifyGimbalAngle([0, 0, gyro_pulses * FA_ANGLE]);
			}

			update()
		}

		//***********************************************************************************************
		//*** Function: Transform angular deltas in Body Axes into Stable Member angular deltas       ***
		//***********************************************************************************************
		function rotate(delta) {
			//console.log('rotate', delta)

			const dp = delta[0] * DEG_TO_RAD
			const dq = delta[1] * DEG_TO_RAD
			const dr = delta[2] * DEG_TO_RAD

			const IMUX_ANGLE_b = imu_angle[0] * DEG_TO_RAD
			const IMUY_ANGLE_b = imu_angle[1] * DEG_TO_RAD
			const IMUZ_ANGLE_b = imu_angle[2] * DEG_TO_RAD			

			const MPI = sin(IMUZ_ANGLE_b);
			const MQI = cos(IMUZ_ANGLE_b) * cos(IMUX_ANGLE_b);
			const MQM = sin(IMUX_ANGLE_b);
			const MRI = -cos(IMUZ_ANGLE_b) * sin(IMUX_ANGLE_b);
			const MRM = cos(IMUX_ANGLE_b);
			const nenner = MRM * MQI - MRI * MQM;

			//---- Calculate Angular Change ----
			const do_b = adjust3(dp - (dq * MRM * MPI - dr * MQM * MPI) / nenner);
			const di_b = adjust3((dq * MRM - dr * MQM) / nenner);
			const dm_b = adjust3((dr * MQI - dq * MRI) / nenner, -PI, PI);

			//--- Rad to Deg and call of Gimbal Angle Modification ----
			modifyGimbalAngle([do_b * RAD_TO_DEG, di_b * RAD_TO_DEG, dm_b * RAD_TO_DEG]);
		}

		//************************************************************************************************
		//*** Function: Modify PIPA Values to match simulated Speed                                   ****
		//************************************************************************************************
		function accelerate(delta) {
			//console.log('accelerate', delta)

			const OGA = imu_angle[0] * DEG_TO_RAD
			const IGA = imu_angle[1] * DEG_TO_RAD
			const MGA = imu_angle[2] * DEG_TO_RAD


			// based on proc modify_pipaXYZ 
			const sinOG = sin(OGA);
			const sinIG = sin(IGA);
			const sinMG = sin(MGA);
			const cosOG = cos(OGA);
			const cosIG = cos(IGA);
			const cosMG = cos(MGA);

			const deltaVX = cosMG * cosIG * delta[0] + (-cosOG * sinMG * cosIG + sinOG * sinIG) * delta[1] + (sinOG * sinMG * cosIG + cosOG * sinIG) * delta[2]

			const deltaVY = sinMG * delta[0] + cosOG * cosMG * delta[1] - sinOG * cosMG * delta[2]

			const deltaVZ = -cosMG * sinIG * delta[0] + (cosOG * sinMG * sinIG + sinOG * cosIG) * delta[1] + (-sinOG * sinMG * sinIG + cosOG * cosIG) * delta[2]

			const dv = [deltaVX, deltaVY, deltaVZ]

			for (let axis = 0; axis < 3; axis++) {
				velocity[axis] += dv[axis];
				const counts = floor((velocity[axis] - pipa[axis] * PIPA_INCR) / PIPA_INCR);

				pipa[axis] += counts;
				/*
				for(; counts > 0; counts--){
					sendPort(0x9F+axis, PINC, 0xFFFF);          // 0x9F = 0237 = 0200 + 037 
				}
				for(; counts < 0; counts++){
					sendPort(0x9F+axis, MINC, 0xFFFF);
				}
				*/
				let p = agc.peek(31 + axis);                      // read PIPA counter (31 = 0x37 = PIPAX)
				p = p & 0x4000 ? -(p ^ 0x7FFF) : p;         // converts from ones-complement to twos-complement                
				p += counts;                                // adds the number of pulses                 
				agc.poke(31 + axis, p < 0 ? (-p) ^ 0x7FFF : p);
			}
		}

        zero()

        return {
            rotate,
            accelerate,
            gyroCoarseAlign,
            zero,
            gyroFineAlign,
            on: event.on.bind(event)            
        }
    }
});
// @ts-check

$$.control.registerControl('DSKY', {

	template: "\n<div class=\"top\">\n    <div class=\"left\">\n        <div class=\"col\">\n            <div bn-style=\"uplink_acty\"><span>UPLINK ACTY</span></div>\n            <div bn-style=\"no_att\">NO ATT</div>\n            <div bn-style=\"stby\">STBY</div>\n            <div bn-style=\"key_rel\">KEY REL</div>\n            <div bn-style=\"opr_err\">OPR ERR</div>\n            <div></div>\n            <div></div>\n        </div>\n\n        <div class=\"col\">\n            <div bn-style=\"temp\">TEMP</div>\n            <div bn-style=\"gimball_lock\"><span>GIMBALL LOCK</span></div>\n            <div bn-style=\"prog\">PROG</div>\n            <div>RESTART</div>\n            <div bn-style=\"tracker\">TRACKER</div>\n            <div bn-style=\"alt\">ALT</div>\n            <div bn-style=\"vel\">VEL</div>\n        </div>\n\n    \n    </div>\n    \n    \n    <div class=\"right\">\n        <div class=\"line\">\n            <div class=\"compActy\" bn-style=\"comp_acty\"><span>COMP ACTY</span></div>\n            <div>\n                <div class=\"label\">PROG</div>\n                <div class=\"digit\" bn-html=\"prog00\"></div>\n            </div>\n    \n        </div>\n        <div class=\"line\">\n            <div>\n                <div class=\"label\">VERB</div>\n                <div class=\"digit\" bn-html=\"verb00\"></div>\n            </div>\n            <div>\n                <div class=\"label\">NOUN</div>\n                <div class=\"digit\" bn-html=\"noun00\"></div>\n            </div>\n        </div>\n        <div class=\"digit big\" bn-html=\"r1\"></div>\n        <div class=\"digit big\" bn-html=\"r2\"></div>\n        <div class=\"digit big\" bn-html=\"r3\"></div>\n    \n    </div>\n</div>\n\n<div class=\"bottom\">\n    <div class=\"keyboard\" bn-event=\"click.key: onKey\">\n        <div>\n            <button class=\"label key\">VERB</button>\n            <button class=\"label key\">NOUN</button>\n        </div>\n        <div>\n            <button class=\"key\">+</button>\n            <button class=\"key\">-</button>\n            <button class=\"key\">0</button>\n        </div>\n        <div>\n            <button class=\"key\">1</button>\n            <button class=\"key\">4</button>\n            <button class=\"key\">7</button>\n        </div>\n        <div>\n            <button class=\"key\">8</button>\n            <button class=\"key\">5</button>\n            <button class=\"key\">2</button>\n        </div>\n        <div>\n            <button class=\"key\">9</button>\n            <button class=\"key\">6</button>\n            <button class=\"key\">3</button>\n        </div>\n        <div>\n            <button class=\"label key\">CLR</button>\n            <button class=\"label key\">PRO</button>\n            <button class=\"label key\">KEY REL</button>\n        </div>\n        <div>\n            <button class=\"label key\">ENTR</button>\n            <button class=\"label key\">RSET</button>\n        </div>\n    \n    </div>\n</div>\n",

	deps: ['breizbot.pager', 'app.emuAgc'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {AppAgc.Services.AGC.Interface} agc
	 */
	init: function (elt, pager, agc) {

		const keyMapping = {
			'VERB': 17,
			'NOUN': 31,
			'+': 26,
			'-': 27,
			'0': 16,
			'CLR': 30,
			'KEY REL': 25,
			'ENTR': 28,
			'RSET': 18
		}

		const bit = agc.bit

		function getDigit(c) {
			var d = 'E';
			switch (c) {
				case 0: d = 'H'; break;
				case 21: d = '0'; break;
				case 3: d = '1'; break;
				case 25: d = '2'; break;
				case 27: d = '3'; break;
				case 15: d = '4'; break;
				case 30: d = '5'; break;
				case 28: d = '6'; break;
				case 19: d = '7'; break;
				case 29: d = '8'; break;
				case 31: d = '9'; break;
			}
			return d;
		}

		let sign1p = 0
		let sign1m = 0
		let sign2p = 0
		let sign2m = 0
		let sign3p = 0
		let sign3m = 0


		const space = '&nbsp;'

		function getColor(value) {
			return { 'background-color': value ? '#ffc200' : '#888888' }
		}

		function getColor2(value) {
			return { 'background-color': value ? '#ffffff' : '#888888' }
		}

		const ctrl = $$.viewController(elt, {
			data: {
				flash_flag: false,
				status11: 0,
				status13: 0,
				status10: 0, // status bits of AGC output channel 010
				digits: '000000+00000+00000+00000',
				comp_acty: function () {
					return getColor(bit(this.status11, 2))
				},
				uplink_acty: function () {
					return getColor2(bit(this.status11, 3))
				},
				temp: function () {
					return getColor(bit(this.status11, 4))
				},
				key_rel: function () {
					return getColor2(bit(this.status11, 5) && this.flash_flag)
				},
				opr_err: function () {
					return getColor2(bit(this.status11, 7) && this.flash_flag)
				},
				stby: function () {
					return getColor2(bit(this.status13, 11))
				},
				vel: function () {
					return getColor(bit(this.status10, 3))
				},
				no_att: function () {
					return getColor2(bit(this.status10, 4))
				},
				alt: function () {
					return getColor(bit(this.status10, 5))
				},
				gimball_lock: function () {
					return getColor(bit(this.status10, 6))
				},
				tracker: function () {
					return getColor(bit(this.status10, 8))
				},
				prog: function () {
					return getColor(bit(this.status10, 9))
				},
				r1: function () {
					return this.digits.slice(6, 12).replace(/H/g, space)
				},
				r2: function () {
					return this.digits.slice(12, 18).replace(/H/g, space)
				},
				prog00: function () {
					return this.digits.slice(0, 2).replace(/H/g, space)
				},
				r3: function () {
					return this.digits.slice(18, 24).replace(/H/g, space)
				},
				verb00: function () {
					if (bit(this.status11, 6) && !this.flash_flag) {
						return space + space;
					}
					else {
						return this.digits.slice(2, 4).replace(/H/g, space)
					}
				},
				noun00: function () {
					if (bit(this.status11, 6) && !this.flash_flag) {
						return space + space;
					}
					else {
						return this.digits.slice(4, 6).replace(/H/g, space)
					}

				}
			},
			events: {
				onKey: function (ev) {
					const text = $(this).text()
					let val = keyMapping[text]
					if (val == undefined) {
						val = parseInt(text)
					}

					ev.stopPropagation()
					elt.trigger('key', { val })
				}
			}
		})



		this.processLights = function (value) {
			//console.log('processLights', value.toString(2))
			ctrl.setData({ lamps: value })
		}

		this.setData = function(data) {
			//console.log('setData', data)
			ctrl.setData(data)
		}

		this.process = function (channel, value) {
			if (channel == 0o10 && value == 0) {
				return
			}

			//console.log('process', channel.toString(8), value)

			if (channel == 0o11) {
				ctrl.setData({status11: value})
				return
			}


			if (channel == 0o13) {
				ctrl.setData({status13: value})
				return
			}

			/*
				The 15-bit code output in i/o channel 10 (octal) can be represented in bit-fields as AAAABCCCCCDDDDD where
				AAAA indicates the digit-pair
					11: PROG
					10: VERB
					9 : NOUN
					8(D), 7, 6: REG1 (5 digits)
					5, 4, 3(C): REG2
					3(D), 2, 1: REG3
	
	
				B sets or resets a +/- sign, 
				CCCCC is the value for the left-hand digit of the pair, 
				DDDDD is the value for the right-hand digit of the pair.
			*/
			const aa = value >> 11
			const bb = (value >> 10) & 1
			const cc = getDigit((value >> 5) & 0x1f)
			const dd = getDigit(value & 0x1f)
			const s = ctrl.model.digits.split('')

			switch (aa) {
				case 12:
					ctrl.setData({ status10: value })
					break
				case 11:
					s[0] = cc
					s[1] = dd
					break
				case 10:
					s[2] = cc
					s[3] = dd
					break
				case 9:
					s[4] = cc
					s[5] = dd
					break
				case 8:
					s[7] = dd
					break
				case 7:
					s[8] = cc
					s[9] = dd
					sign1p = bb
					break
				case 6:
					s[10] = cc
					s[11] = dd
					sign1m = bb
					break
				case 5:
					s[13] = cc
					s[14] = dd
					sign2p = bb
					break
				case 4:
					s[15] = cc
					s[16] = dd
					sign2m = bb
					break
				case 3:
					s[17] = cc
					s[19] = dd
					break
				case 2:
					s[20] = cc
					s[21] = dd
					sign3p = bb
					break
				case 1:
					s[22] = cc
					s[23] = dd
					sign3m = bb
					break

			}
			if (aa != 12) {
				//console.log({ aa, bb, cc, dd })
				s[6] = (sign1p && !sign1m ? '+' : (!sign1p && !sign1m ? 'H' : '-'));
				s[12] = (sign2p && !sign2m ? '+' : (!sign2p && !sign2m ? 'H' : '-'));
				s[18] = (sign3p && !sign3m ? '+' : (!sign3p && !sign3m ? 'H' : '-'));

				const digits = s.join('')
				//console.log('s', digits)
				ctrl.setData({ digits })
			}
			else {
				//console.log('channel', channel, 'value', value.toString(16))
			}


		}

	}


});





// @ts-check

$$.control.registerControl('FDAI', {

	template: "<svg width=\"350\" height=\"360\" bn-bind=\"svg\">\n    <defs>\n      <marker id=\"triangle\" viewBox=\"0 0 10 10\"\n            refX=\"1\" refY=\"5\"\n            markerUnits=\"strokeWidth\"\n            markerWidth=\"10\" markerHeight=\"10\"\n            orient=\"auto\">\n        <path d=\"M 0 0 L 10 5 L 0 10 z\" fill=\"black\"/>\n      </marker>\n      <marker id=\"triangle2\" viewBox=\"0 0 16 16\"\n            refX=\"1\" refY=\"8\"\n            markerUnits=\"strokeWidth\"\n            markerWidth=\"16\" markerHeight=\"16\"\n            orient=\"auto\">\n        <path d=\"M 0 0 L 16 8 L 0 16 z\" fill=\"black\"/>\n      </marker>\n  \n  </defs>\n    \n  </svg>",

	deps: ['breizbot.pager'],

	props: {
		
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, pager) {


		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
			}
		})

		/**@type {SVGElement} */
		const svg = ctrl.scope.svg.get(0)



		const offsetX = 150
		const offsetY = 180
		const RAD_TO_DEG = (180 / Math.PI)
		const DEG_TO_RAD = (Math.PI / 180)
		
		const NEEDLE_SCALE = 42.1875 / 384.0
		
				
		// let error_x = 0
		// let error_y = 0
		// let error_z = 0
		// let Omega_Roll = 0
		// let Omega_Pitch = 0
		// let Omega_Yaw = 0
				
		function setAttrs(obj, attrs) {
			Object.keys(attrs).forEach((attrName) => {
				obj.setAttribute(attrName, attrs[attrName])
			})
		
		}
		
		function createElement(tagName, attrs) {
			const obj = document.createElementNS('http://www.w3.org/2000/svg', tagName)
			if (typeof attrs == 'object') {
				setAttrs(obj, attrs)		
			}
			svg.appendChild(obj)
			return obj
		}
		
		function line(x1, y1, x2, y2, color, args) {
			return createElement('line', Object.assign({ x1, y1, x2, y2, stroke: color }, args))
		}
		
		function text(x, y, str, color, args) {
			const obj = createElement('text', Object.assign({ x, y, fill: color}, args))
			obj.textContent = str
			return obj
		}
		
		function circle(cx, cy, r, color, args) {
			return createElement('circle', Object.assign({ r, cx, cy, fill: color}, args))
		
		}
		
		const widgtM = {}    
		
		
		function setX(objName, x) {
			setAttrs(widgtM[objName], {x1: x, x2: x})
		}
		
		function setY(objName, y) {
			setAttrs(widgtM[objName], {y1: y, y2: y})
		}
		
		
		function setLine(objName, x1, y1, x2, y2) {
			setAttrs(widgtM[objName], {x1, y1, x2, y2})
		}
		
		function setPos(objName, x, y) {
			setAttrs(widgtM[objName], {x, y})
		}
		
		function mark(cx, cy, r, angle, width, color) {
			const j = angle * Math.PI / 180
			const x1 = cx + r * Math.sin(j)
			const y1 = cy + r * Math.cos(j)
			r += width
			const x2 = cx + r * Math.sin(j)
			const y2 = cy + r * Math.cos(j)
			return line(x1, y1, x2, y2, color)
		}
		
		
		
		
		
		// ------------------- Create Pitch Scale ---------------------------------------------
		
		for(let i = -270; i <= 270; i += 30) {
			const col = ((i >= -180 && i <= 0) || (i >= 180 && i <= 360)) ? 'black' : 'white'
			widgtM[`PITCH_${i}`] = line(0, 0, 0, 0, col)
			const j = (i < 0) ? i + 360 : i
			widgtM[`PITCH_TXT_${i}`] = text(0, 0, j, col)
		
		}
		
		// -------------------- Create Z-Axis ---------------------
		
		widgtM['zAxisLM'] = line(0, 0, 0, 0, 'blue')
		
		
		for(let i = -270; i <= 270; i += 30) {
			widgtM[`zAxis_${i}`] = line(0, 0, 0, 0, 'blue')
			const j = (i < 0) ? i + 360 : i
			widgtM[`zAxis_TXT_${i}`] = text(0, 0, j, 'blue')
		
		}
		
		// -------------------- Create Roll Indicator ---------------
		widgtM.RollMarker = line(0, 0, 0, 0, 'black', {'marker-end': 'url(#triangle2)'})
		//[.imu.c2 create line 0 0 0 0 -fill black -arrow last -arrowshape {18 18 7}]
		
		// -------------------- Create Yaw Error Needle -------------
		widgtM.YawErrorNeedle = line(0, offsetY + 10, 0, offsetY + 100, 'orange')
		
		
		// -------------------- Create Pitch Error Needle -----------
		widgtM.PitchErrorNeedle = line(offsetX + 10, 0, offsetX + 100, 0, 'orange')
		
		
		//-------------------- Create Roll Error Needle ------------
		widgtM.RollErrorNeedle = line(0, offsetY - 10, 0, offsetY - 100, 'orange')
		
		circle(offsetX, offsetY, 190, 'none', {stroke: 'darkgrey', 'stroke-width': 180})
		
		
		//---- Create Red Gimbal Lock Area ----
		
		
		for (let i = 70; i < 110; i += 0.5) {
			mark(offsetX, offsetY, 100, i, 10, 'red')
		}
		
		for (let i = 250; i < 290; i += 0.5) {
			mark(offsetX, offsetY, 100, i, 10, 'red')
		}
		
		// ---- Create Roll Scale ----
		
		for (let i = 0; i < 360; i += 10) {
			const mag = ((i % 30) == 0) ? 10 : 15
			mark(offsetX, offsetY, 100, i, mag, 'white')
		}
		
		circle(offsetX, offsetY, 100, 'none', {stroke: 'black', 'stroke-width': 4})
								
		// ------------------- Create Cross Mark -------------------------------
		
		line(offsetX - 10, offsetY, offsetX + 10, offsetY, 'white')
		line(offsetX, offsetY - 10, offsetX, offsetY + 10, 'white')
				
		// ---- Create Yaw Rate Scale and Pointer ----
		
		for (let i = -5; i <= 5; i++) {
			line(offsetX + 10 * i, 310, offsetX + 10 * i, 315, 'white')
		}
		
		widgtM.YawRateMarker = line(0, 325, 0, 324, 'black', {'marker-end': 'url(#triangle)'})
		
		text(offsetX, 310, '0', 'white')
		text(offsetX, 340, 'YAW RATE', 'white')
		
		// ---- Create Roll Rate Scale and Pointer ----
		
		widgtM.RollRateMarker = line(0, 36, 0, 37, 'black', {'marker-end': 'url(#triangle)'})
		
		text(offsetX, 51+11, '0', 'white')
		text(offsetX, 30, 'ROLL RATE', 'white')
		
		for (let i = -5; i <= 5; i++) {
			line(offsetX + 10 * i, 45, offsetX + 10 * i, 50, 'white')
		}
				
		// ---- Create Pitch Rate Scale and Pointer ----
		for (let i = -5; i <= 5; i++) {
			line(280, offsetY + 10 * i, 285, offsetY + 10 * i, 'white')
		}
		
		widgtM.PitchRateMarker = line(296, 0, 295, 0, 'black', {'marker-end': 'url(#triangle)'})
		
		text(offsetX + 128-5, offsetY, '0', 'white', {'alignment-baseline': 'middle'})
		
		text(offsetX + 155, offsetY - 30, 'P', 'white')
		text(offsetX + 155, offsetY - 22, 'I', 'white')
		text(offsetX + 155, offsetY - 14, 'T', 'white')
		text(offsetX + 155, offsetY -  6, 'C', 'white')
		text(offsetX + 155, offsetY +  2, 'H', 'white')
		
		text(offsetX + 155, offsetY + 18, 'R', 'white')
		text(offsetX + 155, offsetY + 26, 'A', 'white')
		text(offsetX + 155, offsetY + 34, 'T', 'white')
		text(offsetX + 155, offsetY + 42, 'E', 'white')
		
		/**
		 * 
		 * @param {number} a 
		 * @returns {number}
		 */					
		function adjust(a) {
			const PI2 = 2 * Math.PI
			
			if (a < -PI2) 
				return  a + PI2
			if (a >= PI2)
				return a - PI2
			
			return a
		}

		function minMax(v, min, max) {
			return Math.max(Math.min(max, v), min)
		}
		
		function move_fdai_marker(imu_angle, error, omega) {

			//console.log('move_fdai_marker', {imu_angle, error, omega})
			const [Omega_Yaw, Omega_Pitch, Omega_Roll] = omega
			const OGA = imu_angle[0] * DEG_TO_RAD
			const IGA = imu_angle[1] * DEG_TO_RAD
			const MGA = imu_angle[2] * DEG_TO_RAD

			const [error_x, error_y, error_z] = error
				
			const sinOG = Math.sin(OGA)
			const sinIG = Math.sin(IGA)
			const sinMG = Math.sin(MGA)
		
			const cosOG = Math.cos(OGA)
			const cosIG = Math.cos(IGA)
			const cosMG = Math.cos(MGA)
		
			// ---- Extract Attitude Euler angles out of the rotation matrix Stable Member into Navigation Base ----
			const t12 = sinMG
			const t22 = cosMG * cosOG    
			const t31 = cosIG * sinMG * sinOG + sinIG * cosOG
			const t32 = -cosMG * sinOG
			const t33 = -sinIG * sinMG * sinOG + cosIG * cosOG
		
			const ROLL  = adjust(Math.atan2(t12, t22))
			const PITCH = adjust(Math.atan2(t31, t33))
			const YAW   = adjust(Math.asin(t32))
			//console.log({ROLL, PITCH, YAW})
		
			// ---- Calculate FDAI Angles ----
			const FDAIZ_RAD = ROLL
			const SIN_Z     = Math.sin(-1 * FDAIZ_RAD)
			const COS_Z     = Math.cos(-1 * FDAIZ_RAD)
		
			const FDAIX_ANGLE = -1 * YAW * RAD_TO_DEG
			const FDAIY_ANGLE = PITCH * RAD_TO_DEG
			const FDAIZ_ANGLE = ROLL * RAD_TO_DEG			
		
			const fdaix = (FDAIX_ANGLE > 0) ? -FDAIX_ANGLE + 360 : Math.abs(FDAIX_ANGLE)
			const fdaiy = (FDAIY_ANGLE < 0) ? FDAIY_ANGLE + 360 : FDAIY_ANGLE
			const fdaiz = (FDAIZ_ANGLE < 0) ? FDAIZ_ANGLE + 360 : FDAIZ_ANGLE
			elt.trigger('data', {euler: [fdaix, fdaiy, fdaiz]})
			
			// ------------------- Move Yaw Rate Marker ----------------------------------------			 	
			setX('YawRateMarker', offsetX - 10 * minMax(Omega_Yaw, -5, 5))
		
			// ------------------- Move Pitch Rate Marker ----------------------------------------		
			setY('PitchRateMarker', offsetY - 10 * minMax(Omega_Pitch, -5, 5))
		
			// ------------------- Move Roll Rate Marker ----------------------------------------
			setX('RollRateMarker', offsetX + 10 * minMax(Omega_Roll, -5, 5))
		
			// ------------------- Move Yaw Error Needle ---------------------------------------
			setX('YawErrorNeedle', offsetX + error_x * NEEDLE_SCALE)
		
			// ------------------- Move Pitch Error Needle ---------------------------------------
			setY('PitchErrorNeedle', offsetY + error_y * NEEDLE_SCALE)
		
			// ------------------- Move Roll Error Needle ---------------------------------------
			setX('RollErrorNeedle', offsetX - error_z * NEEDLE_SCALE)
		
			// ------------------- Rotate Roll Marker (LM-Z-Axis) ------------------------------
		
			//console.log('FDAIZ_RAD', FDAIZ_RAD)
			const r = 85
			const x1 = offsetX + r * Math.sin(FDAIZ_RAD + Math.PI)
			const x2 = offsetX + (r+1) * Math.sin(FDAIZ_RAD + Math.PI)
			const y1 = offsetY + r * Math.cos(FDAIZ_RAD + Math.PI)
			const y2 = offsetY + (r+1) * Math.cos(FDAIZ_RAD + Math.PI)
		
			setLine('RollMarker', x1, y1, x2, y2)
		
		
			/**
			 * 
			 * @param {number} x 
			 * @param {number} y 
			 * @returns {{x: number, y: number}}
			 */
			function MatrixProduct(x, y) {
				return {
					x: (x * COS_Z - y * SIN_Z) + offsetX,
					y: (x * SIN_Z + y * COS_Z) + offsetY
				}
			}
		
			// ------------------- Move Pitch Scale (LM-Y-Axis) ---------------------------------------------
		
			const tmpYAngle = (FDAIY_ANGLE > 180) ? FDAIY_ANGLE - 180 : FDAIY_ANGLE
			for(let i = -270; i <= 270; i += 30) {
				const xp1 = -50
				const xp2 = 50
				const yp1 = -i + tmpYAngle
				const xpt = 0
				const ypt = yp1
		
				// Rotate Pitch Scale along the LM-Z-Axis
				const {x: xpt_r, y: ypt_r} = MatrixProduct(xpt, ypt)
				const {x: xp1_r, y: yp1_r} = MatrixProduct(xp1, yp1)
				const {x: xp2_r, y: yp2_r} = MatrixProduct(xp2, yp1)
		
				// Draw Pitch Marks
				setPos(`PITCH_TXT_${i}`, xpt_r, ypt_r)
				setLine(`PITCH_${i}`, xp1_r, yp1_r, xp2_r, yp2_r)
			}
		
			// -------------------- Move YAW-Axis (LM-X-Axis) ---------------------
		
			const tempXAngle = (FDAIX_ANGLE > 180) ? FDAIX_ANGLE - 360 : FDAIX_ANGLE
			const xpLM1 = -280 + tempXAngle
			const ypLM1 = 0
			const xpLM2 = 280 + tempXAngle
			const ypLM2 = 0
		
			const {x: xpLM1_r, y: ypLM1_r} = MatrixProduct(xpLM1, ypLM1)
			const {x: xpLM2_r, y: ypLM2_r} = MatrixProduct(xpLM2, ypLM2)
		
			setLine('zAxisLM', xpLM1_r, ypLM1_r, xpLM2_r, ypLM2_r)
		
			for(let i = -270; i <= 270; i += 30) {
				const xp1 = i + tempXAngle
				const yp1 = -2
				const xp2 = i + tempXAngle
				const yp2 = 3
				const xpt = i + tempXAngle
				const ypt = 10
		
				// Rotate Pitch Scale along the LM-Z-Axis
				const {x: xpt_r, y: ypt_r} = MatrixProduct(xpt, ypt)
				const {x: xp1_r, y: yp1_r} = MatrixProduct(xp1, yp1)
				const {x: xp2_r, y: yp2_r} = MatrixProduct(xp2, yp2)
		
				// Draw Pitch Marks
				setPos(`zAxis_TXT_${i}`, xpt_r, ypt_r)
				setLine(`zAxis_${i}`, xp1_r, yp1_r, xp2_r, yp2_r)
			}
		
		}
		
		move_fdai_marker([0, 0, 0], [0, 0, 0], [0, 0, 0])	
		
		this.update = move_fdai_marker


	}


	

});





// @ts-check

$$.control.registerControl('INPUT', {

	template: "<div bn-event=\"click.check: onCheckbox\">\n    <div>\n        <fieldset>\n            <legend>ENGINE</legend>\n            <div class=\"data\">\n                <input type=\"checkbox\" bn-data=\"{channel: 30, bit: 3}\" class=\"check\" checked>\n                <label>ENGINE ARMES SIGNAL</label>\n            </div>\n            <div class=\"data\">\n                <input type=\"checkbox\" bn-data=\"{channel: 30, bit: 5}\" class=\"check\">\n                <label>AUTO THROTTLE<br>COMPUTER CONTROL OF DESCENT</label>\n            </div>\n            <div class=\"data\">\n                <input type=\"checkbox\" bn-data=\"{channel: 32, bit: 9}\" class=\"check\">\n                <label>DESCENT ENGINE<br>DISABLED BY CREW</label>\n            </div>\n            <div class=\"data\">\n                <input type=\"checkbox\" bn-data=\"{channel: 32, bit: 10}\" class=\"check\">\n                <label>APPARENT DESCENT ENGINE<br>GIMBAL FAILURE</label>\n            </div>\n        </fieldset>\n        <fieldset>\n            <legend>THRUSTERS</legend>\n            <div class=\"data\">\n                <input type=\"checkbox\" bn-data=\"{channel: 32, bit: 1}\" class=\"check\">\n                <label>THRUSTERS 2&4 DISABLED</label>\n            </div>\n            <div class=\"data\">\n                <input type=\"checkbox\" bn-data=\"{channel: 32, bit: 2}\" class=\"check\">\n                <label>THRUSTERS 5&8 DISABLED</label>\n            </div>\n            <div class=\"data\">\n                <input type=\"checkbox\" bn-data=\"{channel: 32, bit: 3}\" class=\"check\">\n                <label>THRUSTERS 1&3 DISABLED</label>\n            </div>\n            <div class=\"data\">\n                <input type=\"checkbox\" bn-data=\"{channel: 32, bit: 4}\" class=\"check\">\n                <label>THRUSTERS 6&7 DISABLED</label>\n            </div>\n            <div class=\"data\">\n                <input type=\"checkbox\" bn-data=\"{channel: 32, bit: 5}\" class=\"check\">\n                <label>THRUSTERS 14&16 DISABLED</label>\n            </div>\n            <div class=\"data\">\n                <input type=\"checkbox\" bn-data=\"{channel: 32, bit: 6}\" class=\"check\">\n                <label>THRUSTERS 13&15 DISABLED</label>\n            </div>\n            <div class=\"data\">\n                <input type=\"checkbox\" bn-data=\"{channel: 32, bit: 7}\" class=\"check\">\n                <label>THRUSTERS 9&12 DISABLED</label>\n            </div>\n            <div class=\"data\">\n                <input type=\"checkbox\" bn-data=\"{channel: 32, bit: 8}\" class=\"check\">\n                <label>THRUSTERS 10&11 DISABLED</label>\n            </div>\n        </fieldset>\n    </div>\n    <div>\n        <fieldset>\n            <legend>RADAR</legend>\n            <div class=\"data\">\n                <input type=\"checkbox\" bn-data=\"{channel: 33, bit: 2}\" class=\"check\">\n                <label>RR AUTO-POWER ON</label>\n            </div>\n        </fieldset>\n        <fieldset>\n            <legend>IMU</legend>\n            <div class=\"data\">\n                <input type=\"checkbox\" bn-data=\"{channel: 30, bit: 14}\" class=\"check\">\n                <label>ISS TURN ON REQUESTED</label>\n            </div>\n            <div class=\"data\">\n                <input type=\"checkbox\" bn-data=\"{channel: 30, bit: 11}\" class=\"check\">\n                <label>IMU CAGE COMMAND TO DRIVE<br>IMU GIMBAL ANGLES TO 0</label>\n            </div>\n            <div class=\"data\">\n                <input type=\"checkbox\" bn-data=\"{channel: 30, bit: 6}\" class=\"check\" checked>\n                <label>DISPLAY INERTIAL DATA</label>\n            </div>\n        </fieldset>\n        <fieldset>\n            <legend>DAP/ATTITUDE MODE</legend>\n            <div class=\"data\">\n                <input type=\"checkbox\" bn-data=\"{channel: 30, bit: 10}\" class=\"check\" checked>\n                <label>AGC HAS CONTROL OF LM<br>(NOT AGS)</label>\n            </div>\n            <div bn-control=\"brainjs.radiogroup\" bn-event=\"change: onDapModeChange\" bn-val=\"DAP_MODE\">\n                <div class=\"data\">\n                    <input type=\"radio\" value=\"OFF\">\n                    <label>DAP OFF</label>\n                </div>\n                <div class=\"data\">\n                    <input type=\"radio\" value=\"HOLD\">\n                    <label>ATTITUDE HOLD MODE ON</label>\n                </div>\n                <div class=\"data\">\n                    <input type=\"radio\" value=\"AUTO\">\n                    <label>AUTO STABILIZATION<br>OF ATTITUDE ON</label>\n                </div>\n\n            </div>\n        </fieldset>\n\n        <fieldset>\n            <legend>AOT BUTTONS</legend>\n            <div class=\"data\">\n                <input type=\"checkbox\" bn-data=\"{channel: 16, bit: 3}\" class=\"check\">\n                <label>X-AXIS MARK</label>\n            </div>\n            <div class=\"data\">\n                <input type=\"checkbox\" bn-data=\"{channel: 16, bit: 4}\" class=\"check\">\n                <label>Y-AXIS MARK</label>\n            </div>\n            <div class=\"data\">\n                <input type=\"checkbox\" bn-data=\"{channel: 16, bit: 5}\" class=\"check\">\n                <label>MARK REJECT</label>\n            </div>\n        </fieldset>\n\n        <fieldset>\n            <legend>DESCENT CONTROL</legend>\n            <div class=\"data\">\n                <input type=\"checkbox\" bn-data=\"{channel: 16, bit: 6}\" class=\"check\">\n                <label>DESCENT+</label>\n            </div>\n            <div class=\"data\">\n                <input type=\"checkbox\" bn-data=\"{channel: 16, bit: 7}\" class=\"check\">\n                <label>DESCENT-</label>\n            </div>\n        </fieldset>\n    </div>\n\n    <div>\n        <fieldset>\n            <legend>RHC/ACA</legend>\n            <div class=\"slider\">\n                <div class=\"sliderValue\">\n                    <label>Roll</label>\n                    <span bn-text=\"roll\"></span>\n                </div>\n                <div bn-control=\"brainjs.slider\" bn-data=\"rhcRange\" bn-update=\"input\" bn-val=\"roll\" bn-event=\"input: onRollChange\"></div>\n            </div>\n            <div class=\"slider\">\n                <div class=\"sliderValue\">\n                    <label>Pitch</label>\n                    <span bn-text=\"pitch\"></span>\n                </div>\n                <div bn-control=\"brainjs.slider\" bn-data=\"rhcRange\" bn-update=\"input\" bn-val=\"pitch\" bn-event=\"input: onPitchChange\"></div>\n            </div>\n            <div class=\"slider\">\n                <div class=\"sliderValue\">\n                    <label>Yaw</label>\n                    <span bn-text=\"yaw\"></span>\n                </div>\n                <div bn-control=\"brainjs.slider\" bn-data=\"rhcRange\" bn-update=\"input\" bn-val=\"yaw\" bn-event=\"input: onYawChange\"></div>\n            </div>\n            <div>\n                <button bn-event=\"click: onDetent\">DETENT</button>\n            </div>\n        </fieldset>\n\n        <fieldset>\n            <legend>THC</legend>\n            <div bn-control=\"brainjs.radiogroup\" class=\"THC\" bn-event=\"change: onThcChange\" bn-val=\"THC\">\n                <div class=\"data\">\n                    <input type=\"radio\" value=\"NEUTRAL\">\n                    <label>NEUTRAL</label>\n                </div>\n                <div class=\"XYZ\">\n                    <div>\n                        <div class=\"data\">\n                            <input type=\"radio\" value=\"+X\">\n                            <label>+X</label>\n                        </div>\n                        <div class=\"data\">\n                            <input type=\"radio\" value=\"+Y\">\n                            <label>+Y</label>\n                        </div>\n                        <div class=\"data\">\n                            <input type=\"radio\" value=\"+Z\">\n                            <label>+Z</label>\n                        </div>\n                    </div>\n                    <div>\n                        <div class=\"data\">\n                            <input type=\"radio\" value=\"-X\">\n                            <label>-X</label>\n                        </div>\n                        <div class=\"data\">\n                            <input type=\"radio\" value=\"-Y\">\n                            <label>-Y</label>\n                        </div>\n                        <div class=\"data\">\n                            <input type=\"radio\" value=\"-Z\">\n                            <label>-Z</label>\n                        </div>\n                    </div>\n\n                </div>\n\n            </div>\n        </fieldset>\n    </div>\n</div>",

	deps: ['breizbot.gamepad', 'app.emuAgc'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Gamepad.Interface} gamepad
	 * @param {AppAgc.Services.AGC.Interface} agc
	 */
	init: function (elt, gamepad, agc) {


		gamepad.on('connected', (ev) => {
			console.log('connected', ev)
			checkGamePadStatus()
		})

		function checkGamePadStatus() {
			const info = gamepad.getGamepads()[0]
			if (info) {
				const {axes} = info
				//console.log('axes', axes)
				const roll = Math.ceil(axes[0] * 57)
				const pitch = Math.ceil(axes[1] * 57)
				ctrl.setData({roll, pitch})
				setTimeout(checkGamePadStatus, 50)
			}
		}

		

		const ctrl = $$.viewController(elt, {
			data: {
				roll: 0,
				pitch: 0,
				yaw: 0,
				rhcRange: {
					min: -57,
					max: 57
				},
				DAP_MODE: 'OFF',
				THC: 'NEUTRAL'
			},
			events: {
				onDetent: function (ev) {
					//console.log('onDetent')
					ctrl.setData({ roll: 0, pitch: 0, yaw: 0 })
					agc.writeIo(0o166, 0)
					agc.writeIo(0o167, 0)
					agc.writeIo(0o170, 0)
					agc.writeIoBit(0o31, 15, 1)
					reset_rhc()
				},
				onCheckbox: function () {
					const check = $(this)
					const { channel, bit } = check.data()
					const chanOctal = parseInt(channel, 8)
					//console.log('onCheckbox', check.data(), check.getValue())
					agc.writeIoBit(chanOctal, bit, check.getValue() ? 0 : 1)
				},
				onDapModeChange: function (ev) {
					const DAP_MODE = $(this).getValue()
					console.log('onDapModeChange', DAP_MODE)
					switch (DAP_MODE) {
						case 'OFF':
							agc.writeIoBits(0o31, { 13: 1, 14: 1 })
							break
						case 'HOLD':
							agc.writeIoBits(0o31, { 13: 0, 14: 1 })
							break
						case 'AUTO':
							agc.writeIoBits(0o31, { 13: 1, 14: 0 })
							break
					}
				},
				onThcChange: function () {
					const THC = $(this).getValue()
					console.log('onThcChange', THC)
					switch (THC) {
						case 'NEUTRAL':
							agc.writeIoBits(0o31, { 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1 })
							break
						case '+X':
							agc.writeIoBits(0o31, { 7: 0, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1 })
							break
						case '-X':
							agc.writeIoBits(0o31, { 7: 1, 8: 0, 9: 1, 10: 1, 11: 1, 12: 1 })
							break
						case '+Y':
							agc.writeIoBits(0o31, { 7: 1, 8: 1, 9: 0, 10: 1, 11: 1, 12: 1 })
							break
						case '-Y':
							agc.writeIoBits(0o31, { 7: 1, 8: 1, 9: 1, 10: 0, 11: 1, 12: 1 })
							break
						case '+Z':
							agc.writeIoBits(0o31, { 7: 1, 8: 1, 9: 1, 10: 1, 11: 0, 12: 1 })
							break
						case '-Z':
							agc.writeIoBits(0o31, { 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 0 })
							break
					}
				},
				onRollChange: function() {
					console.log('onRollChange', ctrl.model.roll)
					write_rhc(ctrl.model.roll, 0o170, 5, 6)
				},
				onPitchChange: function() {
					console.log('onPitchChange', ctrl.model.pitch)
					write_rhc(ctrl.model.pitch, 0o166, 1, 2)
				},
				onYawChange: function() {
					console.log('onYawChange', ctrl.model.yaw)
					write_rhc(ctrl.model.yaw, 0o167, 3, 4)
				}

			}
		})

		function write_rhc(val, chan, bit1, bit2) {
			const bit15 = agc.getChannelBitState(0o31, 15)
			let bits = {}
			if(val < 0) {
				if (bit15 == 1) {
					bits[bit1] = 1
					bits[bit2] = 0
					setTimeout(reset_rhc, 100)
				}
				bits[15] = 0
				val = (-val) ^0x7FFF // converts to ones-complement
			}
			else if (val > 0) {
				if (bit15 == 1) {
					bits[bit1] = 0
					bits[bit2] = 1
					setTimeout(reset_rhc, 100)
				}
				bits[15] = 0
			}

			//console.log('bits', bits)
			agc.writeIoBits(0o31, bits)
			agc.writeIo(chan, val)

			const {roll, pitch, yaw} = ctrl.model
			if (roll == 0 && pitch == 0 && yaw == 0 && bit15 == 0) {
				agc.writeIoBit(0o31, 15, 1)
			}

		}

		function reset_rhc() {
			console.log('reset_rhc')
			agc.writeIoBits(0o31, {1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1})
		}

	}


});





// @ts-check

$$.control.registerControl('OUTPUT', {

	template: "<div>\n    <fieldset>\n        <legend>RCS JET CONTROL</legend>\n        <div>\n            <div class=\"quad\">\n                <label>QUAD 1</label>\n                    <span bn-style=\"Q1D\" class=\"one\">D</span>\n                    <span bn-style=\"Q1F\" class=\"two\">F</span>\n                    <span bn-style=\"Q1L\" class=\"three\">L</span>\n                    <span bn-style=\"Q1U\" class=\"four\">U</span>\n            </div>\n            <div class=\"quad\">\n                <label>QUAD 4</label>\n                    <span bn-style=\"Q4F\" class=\"one\">F</span>\n                    <span bn-style=\"Q4D\" class=\"two\">D</span>\n                    <span bn-style=\"Q4U\" class=\"three\">U</span>\n                    <span bn-style=\"Q4R\" class=\"four\">R</span>\n            </div>    \n        </div>\n        <div>\n            <div class=\"quad\">\n                <label>QUAD 2</label>\n                    <span bn-style=\"Q2L\" class=\"one\">L</span>\n                    <span bn-style=\"Q2U\" class=\"two\">U</span>\n                    <span bn-style=\"Q2D\" class=\"three\">D</span>\n                    <span bn-style=\"Q2A\" class=\"four\">A</span>\n            </div>\n            <div class=\"quad\">\n                <label>QUAD 3</label>\n                    <span bn-style=\"Q3U\" class=\"one\">U</span>\n                    <span bn-style=\"Q3R\" class=\"two\">R</span>\n                    <span bn-style=\"Q3A\" class=\"three\">A</span>\n                    <span bn-style=\"Q3D\" class=\"four\">D</span>\n            </div>    \n        </div>\n    </fieldset>\n\n    <fieldset>\n        <legend>CDU</legend>\n        <div class=\"field\">\n            <span bn-style=\"CDUZ\">DRIVE CDU Z</span>\n            <span bn-style=\"CDUY\">DRIVE CDU Y</span>\n            <span bn-style=\"CDUX\">DRIVE CDU X</span>\n        </div>\n    </fieldset>\n\n    <fieldset>\n        <legend>HAND CONTROLLER</legend>\n        <div class=\"field\">\n            <span bn-style=\"RHC_COUNTER_EANBLE\">RHC COUNTER ENABLE</span>\n            <span bn-style=\"START_RHC_READ\">START RHC READ</span>\n        </div>\n    </fieldset>\n</div>",

	deps: ['app.emuAgc'],

	props: {
	},

	/**
	 * 
	 * @param {AppAgc.Services.AGC.Interface} agc
	 */
	init: function (elt, agc) {

		const bit = agc.bit

		function getColor(value) {
			return { 'background-color': value ? '#ffffff' : 'transparent' }
		}

		const ctrl = $$.viewController(elt, {
			data: {
				channel5: 0,
				channel6: 0,
				channel14: 0,
				channel13: 0,
				CDUZ: function () {
					return getColor(bit(this.channel14, 13))
				},
				CDUY: function () {
					return getColor(bit(this.channel14, 14))
				},
				CDUX: function () {
					return getColor(bit(this.channel14, 15))
				},
				Q4U: function () {
					return getColor(bit(this.channel5, 1))
				},
				Q4D: function () {
					return getColor(bit(this.channel5, 2))
				},
				Q3U: function () {
					return getColor(bit(this.channel5, 3))
				},
				Q3D: function () {
					return getColor(bit(this.channel5, 4))
				},
				Q2U: function () {
					return getColor(bit(this.channel5, 5))
				},
				Q2D: function () {
					return getColor(bit(this.channel5, 6))
				},
				Q1U: function () {
					return getColor(bit(this.channel5, 7))
				},
				Q1D: function () {
					return getColor(bit(this.channel5, 8))
				},
				Q3A: function () {
					return getColor(bit(this.channel6, 1))
				},
				Q4F: function () {
					return getColor(bit(this.channel6, 2))
				},
				Q1F: function () {
					return getColor(bit(this.channel6, 3))
				},
				Q2A: function () {
					return getColor(bit(this.channel6, 4))
				},
				Q2L: function () {
					return getColor(bit(this.channel6, 5))
				},
				Q3R: function () {
					return getColor(bit(this.channel6, 6))
				},
				Q4R: function () {
					return getColor(bit(this.channel6, 7))
				},
				Q1L: function () {
					return getColor(bit(this.channel6, 8))
				},
				RHC_COUNTER_EANBLE: function() {
					return getColor(bit(this.channel13, 8))
				},
				START_RHC_READ: function() {
					return getColor(bit(this.channel13, 9))
				}
			},
			events: {
			}
		})

		this.update = function () {
			ctrl.setData({
				channel5: agc.getChannelState(0o5),
				channel6: agc.getChannelState(0o6),
				channel13: agc.getChannelState(0o13),
				channel14: agc.getChannelState(0o14)
			 })
		}

	}


});





// @ts-check

$$.control.registerControl('SIMU', {

	template: "<div>\n    <fieldset>\n        <div class=\"data\">\n            <label>SIMULATION TIME:</label>\n            <div>\n                <span bn-text=\"Simulation_Timer_text\"></span>\n                <span class=\"unit\">SEC</span>    \n            </div>\n        </div>\n        <div class=\"data\">\n            <label>LM WEIGHT:</label>\n            <div>\n                <span bn-text=\"LM_Weight_KG_text\"></span>\n                <span class=\"unit\">KG</span>    \n            </div>\n        </div>\n\n    </fieldset>\n    <fieldset>\n        <legend>DESCENT</legend>\n        <div class=\"data\">\n            <label>THRUST:</label>\n            <div>\n                <span bn-text=\"Descent_Thrust_Procent_text\"></span>\n                <span class=\"unit\"></span>\n            </div>\n        </div>\n        <div class=\"data\">\n            <label>PROPELLANT:</label>\n            <div>\n                <span bn-text=\"Descent_Propellant_Mass_KG_text\"></span>\n                <span class=\"unit\">KG</span>\n            </div>\n        </div>\n        <div class=\"data\">\n            <label>FUEL FLOW:</label>\n            <div>\n                <span bn-text=\"Descent_Fuel_Flow_SEC_text\"></span>\n                <span class=\"unit\">KG/S</span>\n            </div>\n        </div>\n        <div class=\"data\">\n            <label>ACCELERATION:</label>\n            <div>\n                <span bn-text=\"Descent_Acceleration_text\"></span>\n                <span class=\"unit\">M/S²</span>\n            </div>\n        </div>\n        <div bn-show=\"!isSeparated\">\n            <div>\n                <input type=\"checkbox\" bn-val=\"DESCENT_ENGINE_FLAG\" bn-update=\"click\">\n                <label>ENGINE ON/OFF</label>\n            </div>\n            <div class=\"data\">\n                <label>Thrust</label>\n                <div>\n                    <span bn-text=\"Descent_Propulsion_N\"></span>\n                    <span class=\"unit\">N</span>\n                </div>\n            </div>\n            <div bn-control=\"brainjs.slider\" bn-data=\"{min: Descent_Propulsion_Min_N, max: Descent_Propulsion_Max_N }\"\n                bn-update=\"input\" bn-val=\"Descent_Propulsion_N\"></div>\n        </div>\n    </fieldset>\n    <fieldset>\n        <legend>Stage</legend>\n        <button bn-event=\"click: onSeperateStage\" bn-prop=\"{disabled: isSeparated}\">SEPARATE STAGE</button>\n    </fieldset>\n    <fieldset>\n        <legend>ASCENT</legend>\n        <div class=\"data\">\n            <label>PROPELLANT:</label>\n            <div>\n                <span bn-text=\"Ascent_Propellant_Mass_KG_text\"></span>\n                <span class=\"unit\">KG</span>\n            </div>\n        </div>\n        <div class=\"data\">\n            <label>FUEL FLOW:</label>\n            <div>\n                <span bn-text=\"Ascent_Fuel_Flow_SEC_text\"></span>\n                <span class=\"unit\">KG/S</span>\n            </div>\n        </div>\n        <div class=\"data\">\n            <label>ACCELERATION:</label>\n            <div>\n                <span bn-text=\"Ascent_Acceleration_text\"></span>\n                <span class=\"unit\">M/S²</span>\n            </div>\n        </div>\n        <div bn-show=\"isSeparated\">\n            <input type=\"checkbox\" bn-val=\"ASCENT_ENGINE_FLAG\" bn-update=\"click\">\n            <label>ENGINE ON/OFF</label>\n        </div>\n    </fieldset>\n    <fieldset>\n        <legend>RCS</legend>\n        <div class=\"data\">\n            <label>PROPELLANT:</label>\n            <div>\n                <span bn-text=\"RCS_Propellant_Mass_KG_text\"></span>\n                <span class=\"unit\">KG</span>\n            </div>\n        </div>\n\n    </fieldset>\n    <fieldset>\n        <legend>EULER ANGLE</legend>\n        <div class=\"data\">\n            <label>YAW:</label>\n            <div>\n                <span bn-text=\"yaw\"></span>\n                <span class=\"unit\">°</span>\n            </div>\n        </div>\n        <div class=\"data\">\n            <label>PITCH:</label>\n            <div>\n                <span bn-text=\"pitch\"></span>\n                <span class=\"unit\">°</span>\n            </div>\n        </div>\n        <div class=\"data\">\n            <label>ROLL:</label>\n            <div>\n                <span bn-text=\"roll\"></span>\n                <span class=\"unit\">°</span>\n            </div>\n        </div>\n    </fieldset>\n\n</div>",

	props: {
	},

	/**
	 * 
	 */
	init: function (elt) {

		const PI = Math.PI
		const PI4 = PI / 4
		const RAD_TO_DEG_PI4 = 180 / PI * PI4
		const abs = Math.abs

		// Simulation Start Values

		let LM_Weight_KG = 0
		let LM_Weight_Ascent_KG = 4670
		let LM_Weight_Descent_KG = 10694

		// Reaction Control System
		let RCS_Propellant_Mass_KG = 287
		let RCS_Thrust_N = 445
		let RCS_Specific_Impulse_MS = 2840

		// Descent Engine
		let Descent_Propellant_Mass_KG = 8355
		let Descent_Propulsion_Max_N = 45040
		let Descent_Propulsion_Min_N = 4560
		let Descent_Specific_Impulse_MS = 3050

		let Descent_Propulsion_N = Descent_Propulsion_Min_N
		let Descent_Fuel_Flow_SEC = 0
		let Descent_Thrust_Procent = 0
		let Descent_Acceleration = 0
		let DESCENT_ENGINE_FLAG = false

		// Ascent Engine
		let Ascent_Propellant_Mass_KG = 2353
		let Ascent_Thrust_N = 15600
		let Ascent_Specific_Impulse_MS = 3050

		let Ascent_Fuel_Flow_SEC = 0
		let Ascent_Acceleration = 0
		let ASCENT_ENGINE_FLAG = false

		// Parameter to calculate Moment of Inertia
		let LM_CONFIG = 'DESCENT'

		let Alpha_Yaw = 0
		let Alpha_Pitch = 0
		let Alpha_Roll = 0
		let Omega_Roll = 0
		let Omega_Pitch = 0
		let Omega_Yaw = 0

		const Moment = {
			'ASCENT': {
				a: [0.0065443852, 0.0035784354, 0.0056946631],
				b: [0.000032,     0.162862,     0.009312],
				c: [-0.006923,    0.002588,    -0.023608]
			},
			'DESCENT': {
				a: [0.0059347674, 0.0014979264, 0.0010451889],
				b: [0.002989,     0.018791,     0.021345],
				c: [0.008721,    -0.068163,    -0.066027]
			}
		}



		const ctrl = $$.viewController(elt, {
			data: {
				Simulation_Timer: 0,
				Descent_Thrust_Procent,
				LM_Weight_KG,
				Descent_Propellant_Mass_KG,
				Descent_Fuel_Flow_SEC,
				Descent_Acceleration,
				RCS_Propellant_Mass_KG,
				Ascent_Propellant_Mass_KG,
				Ascent_Fuel_Flow_SEC,
				Ascent_Acceleration,
				Descent_Propulsion_Min_N,
				Descent_Propulsion_Max_N,
				Descent_Propulsion_N,
				DESCENT_ENGINE_FLAG,
				ASCENT_ENGINE_FLAG,
				LM_CONFIG,
				euler: [0, 0, 0],
				yaw: function() {
					return this.euler[0].toFixed(2)
				},
				pitch: function() {
					return this.euler[1].toFixed(2)
				},
				roll: function() {
					return this.euler[2].toFixed(2)
				},


				Simulation_Timer_text: function () {
					return this.Simulation_Timer.toFixed(1)
				},
				Descent_Thrust_Procent_text: function () {
					return this.Descent_Thrust_Procent.toFixed(1)
				},
				LM_Weight_KG_text: function () {
					return this.LM_Weight_KG.toFixed(0)
				},
				Descent_Propellant_Mass_KG_text: function () {
					return this.Descent_Propellant_Mass_KG.toFixed(0)
				},
				Descent_Fuel_Flow_SEC_text: function () {
					return this.Descent_Fuel_Flow_SEC.toFixed(2)
				},
				Descent_Acceleration_text: function () {
					return this.Descent_Acceleration.toFixed(3)
				},
				RCS_Propellant_Mass_KG_text: function () {
					return this.RCS_Propellant_Mass_KG.toFixed(1)
				},
				Ascent_Propellant_Mass_KG_text: function () {
					return this.Ascent_Propellant_Mass_KG.toFixed(0)
				},
				Ascent_Fuel_Flow_SEC_text: function () {
					return this.Ascent_Fuel_Flow_SEC.toFixed(1)
				},
				Ascent_Acceleration_text: function () {
					return this.Ascent_Acceleration.toFixed(3)
				},

				isSeparated: function() {
					return this.LM_CONFIG == 'ASCENT'
				}

			},
			events: {
				onSeperateStage: function() {
					console.log('onSeperateStage')
					LM_CONFIG = 'ASCENT'
					Descent_Propellant_Mass_KG = 0
					LM_Weight_Descent_KG = 0
					ctrl.setData({LM_CONFIG, Descent_Propellant_Mass_KG, LM_Weight_Descent_KG})

				}
			}
		})

		window.simu = ctrl

		function modify_pipaXYZ(yawDeltaV, PitchDeltaV, RollDeltaV) {
			//console.log('modify_pipaXYZ', {yawDeltaV, PitchDeltaV, RollDeltaV})
			elt.trigger('data', {accelerate: [yawDeltaV, PitchDeltaV, RollDeltaV]})
		}

		function Transform_BodyAxes_StableMember(dp, dq, dr) {
			elt.trigger('data', {rotate: [dp, dq, dr]})	
		}

		// Main Engine Simulation
		function dynamic_simulation(Delta_Time2) {
			//console.log('dynamic_simulation', Delta_Time2)

			LM_Weight_KG = LM_Weight_Ascent_KG + LM_Weight_Descent_KG

			ctrl.setData({
				Descent_Thrust_Procent,
				LM_Weight_KG,
				Descent_Propellant_Mass_KG,
				Descent_Fuel_Flow_SEC,
				Descent_Acceleration,
				RCS_Propellant_Mass_KG,
				Ascent_Propellant_Mass_KG,
				Ascent_Fuel_Flow_SEC,
				Ascent_Acceleration
			})

			DESCENT_ENGINE_FLAG = ctrl.model.DESCENT_ENGINE_FLAG
			ASCENT_ENGINE_FLAG = ctrl.model.ASCENT_ENGINE_FLAG

			//console.log('Descent_Propulsion_N', ctrl.model.Descent_Propulsion_N)
			Descent_Propulsion_N = ctrl.model.Descent_Propulsion_N

			Descent_Thrust_Procent =  Descent_Propulsion_N / Descent_Propulsion_Max_N

			if (DESCENT_ENGINE_FLAG && Descent_Propellant_Mass_KG > 0) {

				Descent_Fuel_Flow_SEC = Descent_Propulsion_N / Descent_Specific_Impulse_MS

				const Descent_Fuel_Flow = Descent_Fuel_Flow_SEC * Delta_Time2

				Descent_Propellant_Mass_KG -= Descent_Fuel_Flow

				LM_Weight_Descent_KG -= Descent_Fuel_Flow

				Descent_Acceleration = Descent_Propulsion_N / LM_Weight_KG

				const yawDeltaV = Descent_Acceleration * Delta_Time2

				modify_pipaXYZ(yawDeltaV, 0, 0)
			}
			else {
				DESCENT_ENGINE_FLAG = false
				Descent_Acceleration = 0
				Descent_Fuel_Flow_SEC = 0
			}

			if (ASCENT_ENGINE_FLAG && Ascent_Propellant_Mass_KG > 0) {

				Ascent_Fuel_Flow_SEC = Ascent_Thrust_N / Ascent_Specific_Impulse_MS

				const Ascent_Fuel_Flow = Ascent_Fuel_Flow_SEC * Delta_Time2

				Ascent_Propellant_Mass_KG -= Ascent_Fuel_Flow

				LM_Weight_Ascent_KG -= Ascent_Fuel_Flow

				Ascent_Acceleration = Ascent_Thrust_N / LM_Weight_Ascent_KG

				const yawDeltaV = Ascent_Acceleration * Delta_Time2

				modify_pipaXYZ(yawDeltaV, 0, 0)

			} else {
				ASCENT_ENGINE_FLAG = false
				Ascent_Acceleration = 0
				Ascent_Fuel_Flow_SEC = 0
			}

			// Calculate Single Jet Accelleration / Moment of Inertia depend on LM weight

			const m = LM_Weight_KG / 65535
			const [a_yaw, a_pitch, a_roll] = Moment[LM_CONFIG].a
			const [b_yaw, b_pitch, b_roll] = Moment[LM_CONFIG].b
			const [c_yaw, c_pitch, c_roll] = Moment[LM_CONFIG].c

			Alpha_Yaw   = RAD_TO_DEG_PI4 * (b_yaw   + a_yaw   / (m + c_yaw))
			Alpha_Pitch = RAD_TO_DEG_PI4 * (b_pitch + a_pitch / (m + c_pitch))
			Alpha_Roll  = RAD_TO_DEG_PI4 * (b_roll  + a_roll  / (m + c_roll))

			// Feed Angular Changes (Delta Time * Omega) into the IMU
			Transform_BodyAxes_StableMember(Omega_Yaw * Delta_Time2, Omega_Pitch * Delta_Time2, Omega_Roll * Delta_Time2)
		}

		// Check AGC Thruster Status and fire dedicated RCS Thruster
		function update_RCS(jetFiring, Delta_Time) {
			//console.log('update_RCS', Delta_Time)

			const [Q4U, Q4D, Q3U, Q3D, Q2U, Q2D, Q1U, Q1D, Q3A, Q4F, Q1F, Q2A, Q2L, Q3R, Q4R, Q1L] = jetFiring
			
			const nv1 = (Q2D == 1 || Q4U == 1) ? Q2D + Q4U : 0
			const nv2 = (Q2U == 1 || Q4D == 1) ? -(Q2U + Q4D) : 0

			const nu1 = (Q1D == 1 || Q3U == 1) ? Q1D + Q3U : 0
			const nu2 = (Q1U == 1 || Q3D == 1) ? -(Q1U + Q3D) : 0

			const np1 = (Q1F == 1 || Q2L == 1 || Q3A == 1 || Q4R == 1) ? Q1F + Q2L + Q3A + Q4R : 0
			const np2 = (Q1L == 1 || Q2A == 1 || Q3R == 1 || Q4F == 1) ? -(Q1L + Q2A + Q3R + Q4F) : 0

			const nv = nv1 + nv2
			const nu = nu1 + nu2
			const np = np1 + np2

			//console.log({nv1, nv2, nu1, nu2, np1, np2})

			// Check for translational commands to calculate change in LM's speed along the pilot axis

			// Along Yaw Axis
			let RCS_Yaw = 0
			if (nv1 != 0 && (nv1 + nv2 == 0)) {
				if (Q2D == 1) {
					RCS_Yaw = Q2D + Q4D
				} else {
					RCS_Yaw = -(Q2U + Q4U)
				}
			}

			if (nu1 != 0 && (nu1 + nu2 == 0)) {
				if (Q1D == 1) {
					RCS_Yaw += Q1D + Q3D
				} else {
					RCS_Yaw -= Q1U + Q3U
				}
			}

			if (RCS_Yaw != 0) {
				const yawDeltaV = Delta_Time * RCS_Yaw * RCS_Thrust_N / LM_Weight_KG
				modify_pipaXYZ(yawDeltaV, 0, 0)
			}

			// Along Pitch or Roll Axis
			if (np1 != 0 && (np1 + np2 == 0)) {
				// Pitch Axis
				if (Q1L == 1) {
					const PitchDeltaV = Delta_Time * 2 * RCS_Thrust_N / LM_Weight_KG
					modify_pipaXYZ(0, PitchDeltaV, 0)
				}

				if (Q3R == 1) {
					const PitchDeltaV = -Delta_Time * 2 * RCS_Thrust_N / LM_Weight_KG
					modify_pipaXYZ(0, PitchDeltaV, 0)
				}

				// Roll Axis
				if (Q2A == 1) {
					const RollDeltaV = Delta_Time * 2 * RCS_Thrust_N / LM_Weight_KG
					modify_pipaXYZ(0, 0, RollDeltaV)
				}

				if (Q1F == 1) {
					const RollDeltaV = -Delta_Time * 2 * RCS_Thrust_N / LM_Weight_KG
					modify_pipaXYZ(0, 0, RollDeltaV)
				}
			}

			// Calculate Delta Omega, Omega and LM weight change
			if (RCS_Propellant_Mass_KG > 0) {
				const Delta_Omega_Yaw   = Alpha_Yaw   * Delta_Time * np
				const Delta_Omega_Pitch = Alpha_Pitch * Delta_Time * (nu - nv)
				const Delta_Omega_Roll  = Alpha_Roll  * Delta_Time * (nu + nv)
				//console.log({Delta_Omega_Yaw, Delta_Omega_Pitch, Delta_Omega_Roll})

				Omega_Yaw   += Delta_Omega_Yaw
				Omega_Pitch += Delta_Omega_Pitch
				Omega_Roll  += Delta_Omega_Roll

				elt.trigger('data', {omega: [Omega_Yaw, Omega_Pitch, Omega_Roll]})

				const RCS_Fuel_Flow = (abs(nv1) + abs(nv2) + abs(nu1) + abs(nu2) + abs(np1) + abs(np2)) * RCS_Thrust_N / RCS_Specific_Impulse_MS * Delta_Time
				LM_Weight_Ascent_KG -= RCS_Fuel_Flow
				RCS_Propellant_Mass_KG -= RCS_Fuel_Flow
			}
		}

		this.dynamic_simulation = dynamic_simulation
		this.update_RCS = update_RCS
		this.setData = function(data) {
			//console.log('setData', data)
			ctrl.setData(data)
		}
	}


});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJzZXJ2aWNlcy9lbXVfYWdjLmpzIiwic2VydmljZXMvaW11LmpzIiwiY29udHJvbHMvRFNLWS9EU0tZLmpzIiwiY29udHJvbHMvRkRBSS9GREFJLmpzIiwiY29udHJvbHMvSU5QVVQvSU5QVVQuanMiLCJjb250cm9scy9PVVRQVVQvT1VUUFVULmpzIiwiY29udHJvbHMvU0lNVS9TSU1VLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25RQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOVJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDellBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBAdHMtY2hlY2tcblxuXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncm9vdFBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdj5cXG4gICAgPGRpdiBibi1jb250cm9sPVxcXCJEU0tZXFxcIiBibi1ldmVudD1cXFwia2V5OiBvbktleVxcXCIgYm4taWZhY2U9XFxcImRza3lcXFwiPjwvZGl2PlxcblxcbiAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcIkZEQUlcXFwiIGJuLWlmYWNlPVxcXCJmZGFpXFxcIiBibi1ldmVudD1cXFwiZGF0YTogb25GZGFpRGF0YVxcXCI+PC9kaXY+XFxuXFxuPC9kaXY+XFxuXFxuPGRpdj5cXG4gICAgPGRpdiBibi1jb250cm9sPVxcXCJJTlBVVFxcXCI+PC9kaXY+XFxuICAgIDxkaXYgYm4tY29udHJvbD1cXFwiT1VUUFVUXFxcIiBibi1pZmFjZT1cXFwib3V0cHV0XFxcIj48L2Rpdj5cXG48L2Rpdj5cXG5cXG48ZGl2IGJuLWNvbnRyb2w9XFxcIlNJTVVcXFwiIGJuLWlmYWNlPVxcXCJzaW11XFxcIiBibi1ldmVudD1cXFwiZGF0YTogb25TaW11RGF0YVxcXCI+PC9kaXY+XFxuXFxuXCIsXG5cblx0ZGVwczogWydicmVpemJvdC5maWxlcycsICdhcHAuZW11QWdjJywgJ2FwcC5pbXUnLCAnYnJhaW5qcy5odHRwJ10sXG5cblx0cHJvcHM6IHtcblx0fSxcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuRmlsZXMuSW50ZXJmYWNlfSBmaWxlc1xuXHQgKiBAcGFyYW0ge0FwcEFnYy5TZXJ2aWNlcy5BR0MuSW50ZXJmYWNlfSBhZ2Ncblx0ICogQHBhcmFtIHtBcHBBZ2MuU2VydmljZXMuSU1VLkludGVyZmFjZX0gaW11XG5cdCAqIEBwYXJhbSB7QnJhaW5qcy5TZXJ2aWNlcy5IdHRwLkludGVyZmFjZX0gaHR0cFxuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgZmlsZXMsIGFnYywgaW11LCBodHRwKSB7XG5cblx0XHR3aW5kb3cuYWdjID0gYWdjXG5cblx0XHRjb25zdCBiaXQgPSBhZ2MuYml0XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uS2V5OiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbktleScsIGRhdGEpXG5cdFx0XHRcdFx0Y29uc3QgeyB2YWwgfSA9IGRhdGFcblx0XHRcdFx0XHRpZiAoIWlzTmFOKHZhbCkpIHtcblx0XHRcdFx0XHRcdGFnYy53cml0ZUlvKDBvMTUsIHZhbClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7IC8vIFBSTyBrZXlcblx0XHRcdFx0XHRcdGFnYy53cml0ZUlvQml0KDBvMzIsIDE0LCAwKVxuXHRcdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdGFnYy53cml0ZUlvQml0KDBvMzIsIDE0LCAxKVxuXHRcdFx0XHRcdFx0fSwgMjAwKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25TaW11RGF0YTogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25TaW11RGF0YScsIGRhdGEpXG5cdFx0XHRcdFx0Y29uc3QgeyByb3RhdGUsIGFjY2VsZXJhdGUgfSA9IGRhdGFcblx0XHRcdFx0XHRpZiAocm90YXRlKSB7XG5cdFx0XHRcdFx0XHRpbXUucm90YXRlKHJvdGF0ZSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGFjY2VsZXJhdGUpIHtcblx0XHRcdFx0XHRcdGltdS5hY2NlbGVyYXRlKGFjY2VsZXJhdGUpXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKGRhdGEub21lZ2EpIHtcblx0XHRcdFx0XHRcdG9tZWdhID0gZGF0YS5vbWVnYVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkZkYWlEYXRhOiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdGREFJIERBVEEnLCBkYXRhKVxuXHRcdFx0XHRcdHNpbXUuc2V0RGF0YShkYXRhKVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cblx0XHQvKipAdHlwZSB7QXBwQWdjLkNvbnRyb2xzLkRTS1kuSW50ZXJmYWNlfSAqL1xuXHRcdGNvbnN0IGRza3kgPSBjdHJsLnNjb3BlLmRza3lcblxuXHRcdC8qKkB0eXBlIHtBcHBBZ2MuQ29udHJvbHMuU0lNVS5JbnRlcmZhY2V9ICovXG5cdFx0Y29uc3Qgc2ltdSA9IGN0cmwuc2NvcGUuc2ltdVxuXG5cdFx0LyoqQHR5cGUge0FwcEFnYy5Db250cm9scy5GREFJLkludGVyZmFjZX0gKi9cblx0XHRjb25zdCBmZGFpID0gY3RybC5zY29wZS5mZGFpXG5cblx0XHQvKipAdHlwZSB7QXBwQWdjLkNvbnRyb2xzLk9VVFBVVC5JbnRlcmZhY2V9ICovXG5cdFx0Y29uc3Qgb3V0cHV0ID0gY3RybC5zY29wZS5vdXRwdXRcblxuXHRcdGxldCBpbXVEYXRhID0gbnVsbFxuXHRcdGxldCBvbWVnYSA9IFswLCAwLCAwXVxuXG5cdFx0aW11Lm9uKCdkYXRhJywgKGRhdGEpID0+IHtcblx0XHRcdC8vY29uc29sZS5sb2coJ2ltdURhdGEnLCBkYXRhKVxuXHRcdFx0aW11RGF0YSA9IGRhdGFcblx0XHR9KVxuXG5cblx0XHRhc3luYyBmdW5jdGlvbiBpbml0KCkge1xuXG5cdFx0XHQvL3Byb2ZpbGUgPSBhd2FpdCBodHRwLmdldChmaWxlcy5hc3NldHNVcmwoJ3Byb2ZpbGUuanNvbicpKVxuXHRcdFx0Ly9jb25zb2xlLmxvZygncHJvZmlsZScsIHByb2ZpbGUpXG5cdFx0XHRhd2FpdCBhZ2MubG9hZFJvbShmaWxlcy5hc3NldHNVcmwoJ0xNWTk5UjAuYmluJykpXG5cdFx0XHRhZ2Muc3RhcnQoKVxuXG5cdFx0XHRsZXQgRGVsdGFfVGltZTIgPSAwXG5cdFx0XHRsZXQgRGVsdGFfVGltZTQgPSAwXG5cdFx0XHRsZXQgRGVsdGFfVGltZTMgPSAwXG5cdFx0XHRsZXQgU2ltdWxhdGlvbl9UaW1lcl9Jbml0ID0gRGF0ZS5ub3coKVxuXHRcdFx0bGV0IFNpbXVsYXRpb25fVGltZXIgPSAwXG5cdFx0XHRsZXQgemVpdCA9IDBcblx0XHRcdGxldCBKRVRfRkxBRyA9IGZhbHNlXG5cdFx0XHRsZXQgZmxhc2hfZmxhZyA9IGZhbHNlXG5cdFx0XHRsZXQgemVybyA9IGZhbHNlXG5cdFx0XHRsZXQgamV0RmlyaW5nID0gbmV3IEFycmF5KDE2KS5maWxsKDApXG5cblx0XHRcdHNldEludGVydmFsKCgpID0+IHtcblx0XHRcdFx0YWdjLnJ1bigpXG5cdFx0XHR9LCAxMClcblxuXHRcdFx0ZnVuY3Rpb24gbG9vcCgpIHtcblx0XHRcdFx0Y29uc3QgZGF0YSA9IGFnYy5yZWFkSW8oKVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdkYXRhJywgZGF0YSlcblx0XHRcdFx0aWYgKGRhdGEgIT0gbnVsbCkge1xuXHRcdFx0XHRcdGNvbnN0IHsgY2hhbm5lbCwgdmFsdWUgfSA9IGRhdGFcblxuXHRcdFx0XHRcdGlmIChbMG8xMywgMG8xNF0uaW5jbHVkZXMoY2hhbm5lbCkpIHtcblx0XHRcdFx0XHRcdG91dHB1dC51cGRhdGUoKVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHN3aXRjaCAoY2hhbm5lbCkge1xuXHRcdFx0XHRcdFx0Y2FzZSAwbzEwOlxuXHRcdFx0XHRcdFx0Y2FzZSAwbzExOlxuXHRcdFx0XHRcdFx0Y2FzZSAwbzEzOlxuXHRcdFx0XHRcdFx0XHRkc2t5LnByb2Nlc3MoY2hhbm5lbCwgdmFsdWUpXG5cdFx0XHRcdFx0XHRcdGJyZWFrXG5cdFx0XHRcdFx0XHRjYXNlIDBvMTI6XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2NoYW5uZWxVcGRhdGUnLCBjaGFubmVsLnRvU3RyaW5nKDgpLCB2YWx1ZS50b1N0cmluZygyKS5wYWRTdGFydCgxNSwgJzAnKSlcblx0XHRcdFx0XHRcdFx0aWYgKGJpdCh2YWx1ZSwgNSkgJiYgIXplcm8pIHtcblx0XHRcdFx0XHRcdFx0XHRpbXUuemVybygpXG5cdFx0XHRcdFx0XHRcdFx0emVybyA9IHRydWVcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRlbHNlIGlmICghYml0KHZhbHVlLCA1KSAmJiB6ZXJvKSB7XG5cdFx0XHRcdFx0XHRcdFx0emVybyA9IGZhbHNlXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRjYXNlIDBvMTc0OlxuXHRcdFx0XHRcdFx0Y2FzZSAwbzE3NTpcblx0XHRcdFx0XHRcdGNhc2UgMG8xNzY6XG5cdFx0XHRcdFx0XHRcdGltdS5neXJvQ29hcnNlQWxpZ24oY2hhbm5lbCwgdmFsdWUpO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdGNhc2UgMG8xNzc6XG5cdFx0XHRcdFx0XHRcdGltdS5neXJvRmluZUFsaWduKGNoYW5uZWwsIHZhbHVlKTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRjYXNlIDBvNTpcblx0XHRcdFx0XHRcdGNhc2UgMG82OlxuXHRcdFx0XHRcdFx0XHRvdXRwdXQudXBkYXRlKClcblx0XHRcdFx0XHRcdFx0amV0RmlyaW5nID0gZ2V0SmV0RmlyaW5nKClcblx0XHRcdFx0XHRcdFx0SkVUX0ZMQUcgPSBqZXRGaXJpbmcuaW5jbHVkZXMoMSlcblxuXHRcdFx0XHRcdFx0XHRicmVha1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRsb29wKClcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRjb25zdCB0ID0gRGF0ZS5ub3coKVxuXHRcdFx0XHRcdGNvbnN0IERlbHRhX1RpbWUgPSB0IC0gU2ltdWxhdGlvbl9UaW1lcl9Jbml0XG5cdFx0XHRcdFx0RGVsdGFfVGltZTIgKz0gRGVsdGFfVGltZVxuXHRcdFx0XHRcdERlbHRhX1RpbWU0ICs9IERlbHRhX1RpbWVcblx0XHRcdFx0XHREZWx0YV9UaW1lMyArPSBEZWx0YV9UaW1lXG5cdFx0XHRcdFx0U2ltdWxhdGlvbl9UaW1lciArPSBEZWx0YV9UaW1lXG5cdFx0XHRcdFx0U2ltdWxhdGlvbl9UaW1lcl9Jbml0ID0gdFxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coeyBEZWx0YV9UaW1lMiwgRGVsdGFfVGltZTQgfSlcblx0XHRcdFx0XHR6ZWl0ID0gMTBcblx0XHRcdFx0XHRpZiAoSkVUX0ZMQUcpIHtcblx0XHRcdFx0XHRcdHNpbXUudXBkYXRlX1JDUyhqZXRGaXJpbmcsIERlbHRhX1RpbWUgLyAxMDAwKVxuXHRcdFx0XHRcdFx0emVpdCA9IDVcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoRGVsdGFfVGltZTIgPiAyNSkge1xuXHRcdFx0XHRcdFx0c2ltdS5zZXREYXRhKHsgU2ltdWxhdGlvbl9UaW1lcjogU2ltdWxhdGlvbl9UaW1lciAvIDEwMDAgfSlcblxuXHRcdFx0XHRcdFx0c2ltdS5keW5hbWljX3NpbXVsYXRpb24oRGVsdGFfVGltZTIgLyAxMDAwKVxuXHRcdFx0XHRcdFx0RGVsdGFfVGltZTIgPSAwXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChEZWx0YV9UaW1lNCA+IDEwMCkge1xuXHRcdFx0XHRcdFx0aWYgKGltdURhdGEgIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0XHRjb25zdCB7IGltdV9hbmdsZSwgZXJyb3IgfSA9IGltdURhdGFcblx0XHRcdFx0XHRcdFx0ZmRhaS51cGRhdGUoaW11X2FuZ2xlLCBlcnJvciwgb21lZ2EpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHREZWx0YV9UaW1lNCA9IDBcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKERlbHRhX1RpbWUzID4gMzAwKSB7XG5cdFx0XHRcdFx0XHRmbGFzaF9mbGFnID0gIWZsYXNoX2ZsYWdcblx0XHRcdFx0XHRcdGRza3kuc2V0RGF0YSh7IGZsYXNoX2ZsYWcgfSlcblx0XHRcdFx0XHRcdERlbHRhX1RpbWUzID0gMFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRzZXRUaW1lb3V0KGxvb3AsIHplaXQpXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0bG9vcCgpXG5cblx0XHRcdGZ1bmN0aW9uIGdldEpldEZpcmluZygpIHtcblx0XHRcdFx0Y29uc3QgcmV0ID0gW11cblx0XHRcdFx0Zm9yIChsZXQgaSA9IDE7IGkgPD0gODsgaSsrKSB7XG5cdFx0XHRcdFx0cmV0LnB1c2goYWdjLmdldENoYW5uZWxCaXRTdGF0ZSgwbzUsIGkpKVxuXHRcdFx0XHR9XG5cdFx0XHRcdGZvciAobGV0IGkgPSAxOyBpIDw9IDg7IGkrKykge1xuXHRcdFx0XHRcdHJldC5wdXNoKGFnYy5nZXRDaGFubmVsQml0U3RhdGUoMG82LCBpKSlcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gcmV0XG5cdFx0XHR9XG5cblxuXG5cdFx0fVxuXG5cdFx0aW5pdCgpXG5cblx0fVxuXG5cbn0pXG5cblxuXG5cblxuXG5cbiIsIlxuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2FwcC5lbXVBZ2MnLCB7XG5cbiAgICBkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJ10sXG5cbiAgICBpbml0OiBmdW5jdGlvbiAoY29uZmlnKSB7XG5cbiAgICAgICAgY29uc3Qgc2V0X2ZpeGVkID0gTW9kdWxlLmN3cmFwKCdzZXRfZml4ZWQnLCBudWxsLCBbJ251bWJlciddKVxuICAgICAgICBjb25zdCByZXNldCA9IE1vZHVsZS5jd3JhcCgnY3B1X3Jlc2V0JylcbiAgICAgICAgY29uc3Qgc3RlcENwdSA9IE1vZHVsZS5jd3JhcCgnY3B1X3N0ZXAnLCBudWxsLCBbJ251bWJlciddKVxuICAgICAgICBjb25zdCBwYWNrZXRSZWFkID0gTW9kdWxlLmN3cmFwKCdwYWNrZXRfcmVhZCcsICdudW1iZXInKVxuICAgICAgICBjb25zdCBwYWNrZXRXcml0ZSA9IE1vZHVsZS5jd3JhcCgncGFja2V0X3dyaXRlJywgbnVsbCwgWydudW1iZXInLCAnbnVtYmVyJ10pXG4gICAgICAgIGNvbnN0IGdldF9lcmFzYWJsZV9wdHIgPSBNb2R1bGUuY3dyYXAoJ2dldF9lcmFzYWJsZV9wdHInLCAnbnVtYmVyJylcblxuICAgICAgICBjb25zdCBjeWNsZU1zID0gMC4wMTE3MiAvLyAxMS43MiBtaWNyb3NlY29uZHMgcGVyIEFHQyBpbnN0cnVjdGlvblxuXG5cbiAgICAgICAgbGV0IHN0YXJ0VGltZSA9IDBcbiAgICAgICAgbGV0IHRvdGFsU3RlcHMgPSAwXG4gICAgICAgIGxldCBlcmFzYWJsZVB0ciA9IG51bGxcblxuICAgICAgICBjb25zdCBtYXNrcyA9IHtcbiAgICAgICAgICAgIDBvMzA6IDBiMTExMTExMTExMTExMTExLFxuICAgICAgICAgICAgMG8zMTogMGIxMTExMTExMTExMTExMTEsXG4gICAgICAgICAgICAwbzMyOiAwYjAxMDAwMTExMTExMTExMSxcbiAgICAgICAgICAgIDBvMzM6IDBiMTExMTExMTExMTExMTEwXG5cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNoYW5uZWxzID0ge1xuICAgICAgICAgICAgMG8zMDogMGIwMTExMTAwMTEwMTEwMDEsXG4gICAgICAgICAgICAwbzMxOiAwYjExMTExMTExMTExMTExMSxcbiAgICAgICAgICAgIDBvMzI6IDBiMDEwMDAxMTExMTExMTExLFxuICAgICAgICAgICAgMG8zMzogMGIxMDExMTExMTExMTExMTBcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHdyaXRlSW8oY2hhbm5lbCwgdmFsdWUsIG1hc2spIHtcbiAgICAgICAgICAgIGNoYW5uZWwgPSBwYXJzZUludChjaGFubmVsKVxuICAgICAgICAgICAgLy8gaWYgKG1hc2spIHtcbiAgICAgICAgICAgIC8vICAgICBjb25zb2xlLmxvZygnd3JpdGVJbycsIGNoYW5uZWwudG9TdHJpbmcoOCksIHZhbHVlLnRvU3RyaW5nKDIpLnBhZFN0YXJ0KDE1LCAnMCcpLFxuICAgICAgICAgICAgLy8gICAgICBtYXNrLnRvU3RyaW5nKDIpLnBhZFN0YXJ0KDE1LCAnMCcpKVxuICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgLy8gZWxzZSB7XG4gICAgICAgICAgICAvLyAgICAgY29uc29sZS5sb2coJ3dyaXRlSW8nLCBjaGFubmVsLnRvU3RyaW5nKDgpLCB2YWx1ZSlcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIGlmIChtYXNrICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHBhY2tldFdyaXRlKGNoYW5uZWwgKyAyNTYsIG1hc2spIC8vIHNldCBtYXNrIGJpdCAxNVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGFja2V0V3JpdGUoY2hhbm5lbCwgdmFsdWUpXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzZXRCaXQodmFyaWEsIG5iaXQsIHZhbHVlKSB7XG4gICAgICAgICAgICBjb25zdCBtYXNrID0gYml0TWFzayhuYml0KVxuICAgICAgICAgICAgaWYgKHZhbHVlID09IDApIHtcbiAgICAgICAgICAgICAgICB2YXJpYSAmPSB+bWFza1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyaWEgfD0gbWFza1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHZhcmlhXG5cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHdyaXRlSW9CaXRzKGNoYW5uZWwsIGJpdHMpIHtcbiAgICAgICAgICAgIGxldCBtYXNrID0gMFxuICAgICAgICAgICAgbGV0IHZhbHVlID0gMFxuICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKGJpdHMpLmxlbmd0aCA9PSAwKSByZXR1cm5cbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3dyaXRlSW9CaXRzJywgY2hhbm5lbC50b1N0cmluZyg4KSwgYml0cylcbiAgICAgICAgICAgIE9iamVjdC5lbnRyaWVzKGJpdHMpLmZvckVhY2goKFtuYml0LCB2YWxdKSA9PiB7XG4gICAgICAgICAgICAgICAgbWFzayA9IHNldEJpdChtYXNrLCBuYml0LCAxKVxuICAgICAgICAgICAgICAgIHZhbHVlID0gc2V0Qml0KHZhbHVlLCBuYml0LCB2YWwpXG4gICAgICAgICAgICAgICAgY2hhbm5lbHNbY2hhbm5lbF0gPSBzZXRCaXQoY2hhbm5lbHNbY2hhbm5lbF0sIG5iaXQsIHZhbClcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnbWFzayAnLCBtYXNrLnRvU3RyaW5nKDIpLnBhZFN0YXJ0KDE1LCAnMCcpKVxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3ZhbHVlJywgdmFsdWUudG9TdHJpbmcoMikucGFkU3RhcnQoMTUsICcwJykpXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgY2hhblske2NoYW5uZWwudG9TdHJpbmcoOCkucGFkU3RhcnQoMywgJzAnKX1dPWAgKyBjaGFubmVsc1tjaGFubmVsXS50b1N0cmluZygyKS5wYWRTdGFydCgxNSwgJzAnKSlcblxuICAgICAgICAgICAgd3JpdGVJbyhjaGFubmVsLCB2YWx1ZSwgbWFzaylcblxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gd3JpdGVJb0JpdChjaGFubmVsLCBuYml0LCB2YWx1ZSkge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IHt9XG4gICAgICAgICAgICBkYXRhW25iaXRdID0gdmFsdWVcbiAgICAgICAgICAgIHdyaXRlSW9CaXRzKGNoYW5uZWwsIGRhdGEpXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwZWVrKG9mZnNldCkge1xuICAgICAgICAgICAgY29uc3QgcmV0ID0gTW9kdWxlLmdldFZhbHVlKGVyYXNhYmxlUHRyICsgb2Zmc2V0ICogMiwgJ2kxNicpICYgMHg3ZmZmXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdwZWVrJywge29mZnNldCwgcmV0fSlcbiAgICAgICAgICAgIHJldHVybiByZXRcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHBva2Uob2Zmc2V0LCB2YWx1ZSkge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygncG9rZScsIHtvZmZzZXQsIHZhbHVlfSlcbiAgICAgICAgICAgIE1vZHVsZS5zZXRWYWx1ZShlcmFzYWJsZVB0ciArIG9mZnNldCAqIDIsIHZhbHVlLCAnaTE2JylcbiAgICAgICAgfVxuXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIGxvYWRSb20odXJsKSB7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybClcbiAgICAgICAgICAgIGNvbnN0IGJpbmFyeSA9IGF3YWl0IHJlc3BvbnNlLmFycmF5QnVmZmVyKClcblxuICAgICAgICAgICAgY29uc3Qgcm9tQXJyYXkgPSBuZXcgVWludDhBcnJheShiaW5hcnkpXG4gICAgICAgICAgICBjb25zb2xlLmxvZygncm9tQXJyYXknLCByb21BcnJheS5sZW5ndGgpXG4gICAgICAgICAgICBjb25zdCByb21QdHIgPSBNb2R1bGUuX21hbGxvYyhyb21BcnJheS5sZW5ndGggKiByb21BcnJheS5CWVRFU19QRVJfRUxFTUVOVClcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyb21QdHInLCByb21QdHIpXG5cbiAgICAgICAgICAgIE1vZHVsZS5IRUFQOC5zZXQocm9tQXJyYXksIHJvbVB0cilcbiAgICAgICAgICAgIHNldF9maXhlZChyb21QdHIpXG4gICAgICAgICAgICBNb2R1bGUuX2ZyZWUocm9tUHRyKVxuICAgICAgICAgICAgZXJhc2FibGVQdHIgPSBnZXRfZXJhc2FibGVfcHRyKClcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdlcmFzYWJsZVB0cicsIGVyYXNhYmxlUHRyKVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc3RhcnQoKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc3RhcnQnKVxuICAgICAgICAgICAgcmVzZXQoKTtcblxuICAgICAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgICAgIE9iamVjdC5lbnRyaWVzKGNoYW5uZWxzKS5mb3JFYWNoKChbY2hhbiwgdmFsXSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXNrID0gbWFza3NbY2hhbl1cbiAgICAgICAgICAgICAgICAgICAgd3JpdGVJbyhjaGFuLCB2YWwsIG1hc2spXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBzZXRzID0gWzBvNSwgMG82LCAwbzE0XVxuICAgICAgICAgICAgICAgIHNldHMuZm9yRWFjaCgoY2hhbikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjaGFubmVsc1tjaGFuXSA9IDBcbiAgICAgICAgICAgICAgICB9KVxuICAgIFxuICAgICAgICAgICAgfSwgMTAwKVxuICAgICAgICAgICAgc3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KClcbiAgICAgICAgICAgIHRvdGFsU3RlcHMgPSAwXG5cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJ1bigpIHtcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldFN0ZXBzID0gTWF0aC5mbG9vcigocGVyZm9ybWFuY2Uubm93KCkgLSBzdGFydFRpbWUpIC8gY3ljbGVNcylcbiAgICAgICAgICAgIGNvbnN0IGRpZmZTdGVwcyA9IHRhcmdldFN0ZXBzIC0gdG90YWxTdGVwc1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnZGlmZlN0ZXBzJywgZGlmZlN0ZXBzKVxuICAgICAgICAgICAgaWYgKGRpZmZTdGVwcyA8IDAgfHwgZGlmZlN0ZXBzID4gMTAwMDAwKSB7XG4gICAgICAgICAgICAgICAgLy8gTm8gbWF0dGVyIHdoaWNoIGNhdXNlLCBwcmV2ZW50IGhhbmdpbmcgZHVlIHRvIGhpZ2ggc3RlcCBjb3VudHMgZHVlIHRvIGludGVnZXIgb3ZlcmZsb3dzLlxuICAgICAgICAgICAgICAgIHN0YXJ0VGltZSA9IHBlcmZvcm1hbmNlLm5vdygpXG4gICAgICAgICAgICAgICAgdG90YWxTdGVwcyA9IDBcbiAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0ZXBDcHUoZGlmZlN0ZXBzKVxuICAgICAgICAgICAgdG90YWxTdGVwcyArPSBkaWZmU3RlcHNcbiAgICAgICAgICAgIC8vcmVhZEFsbElvKCkgICAgICAgICAgICBcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGJpdCh2YWwsIG4pIHtcbiAgICAgICAgICAgIHJldHVybiAodmFsID4+IChuLTEpKSAmIDFcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldENoYW5uZWxTdGF0ZShjaGFubmVsKSB7XG4gICAgICAgICAgICByZXR1cm4gY2hhbm5lbHNbY2hhbm5lbF1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGxvZ0NoYW5uZWxTdGF0ZShjaGFubmVsKSB7XG4gICAgICAgICAgICBjb25zdCBjaGFubmVsT2N0YWwgPSBwYXJzZUludChjaGFubmVsKS50b1N0cmluZyg4KS5wYWRTdGFydCgnMycsICcwJylcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBjaGFubmVsWyR7Y2hhbm5lbE9jdGFsfV0gPSBgICsgY2hhbm5lbHNbY2hhbm5lbF0udG9TdHJpbmcoMikucGFkU3RhcnQoMTUsICcwJykpXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBsb2dBbGxDaGFubmVsU3RhdGUoKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhjaGFubmVscykuZm9yRWFjaCgoY2hhbm5lbCkgPT4ge1xuICAgICAgICAgICAgICAgIGxvZ0NoYW5uZWxTdGF0ZShjaGFubmVsKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldENoYW5uZWxCaXRTdGF0ZShjaGFubmVsLCBuYml0KSB7XG4gICAgICAgICAgICByZXR1cm4gYml0KGNoYW5uZWxzW2NoYW5uZWxdLCBuYml0KVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVhZElvKCkge1xuICAgICAgICAgICAgbGV0IHJldCA9IG51bGxcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBwYWNrZXRSZWFkKClcbiAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2hhbm5lbCA9IGRhdGEgPj4gMTZcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGRhdGEgJiAweGZmZmZcblxuICAgICAgICAgICAgICAgIGNoYW5uZWxzW2NoYW5uZWxdID0gdmFsdWVcbiAgICAgICAgICAgICAgICByZXQgPSB7IGNoYW5uZWwsIHZhbHVlIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXRcbiAgICAgICAgfVxuXG5cbiAgICAgICAgZnVuY3Rpb24gYml0TWFzayhuKSB7XG4gICAgICAgICAgICByZXR1cm4gMSA8PCAobiAtIDEpXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgd3JpdGVJbyxcbiAgICAgICAgICAgIHdyaXRlSW9CaXQsXG4gICAgICAgICAgICB3cml0ZUlvQml0cyxcbiAgICAgICAgICAgIGxvYWRSb20sXG4gICAgICAgICAgICBzdGFydCxcbiAgICAgICAgICAgIHJ1bixcbiAgICAgICAgICAgIHJlYWRJbyxcbiAgICAgICAgICAgIHBlZWssXG4gICAgICAgICAgICBwb2tlLFxuICAgICAgICAgICAgZ2V0Q2hhbm5lbFN0YXRlLFxuICAgICAgICAgICAgZ2V0Q2hhbm5lbEJpdFN0YXRlLFxuICAgICAgICAgICAgYml0TWFzayxcbiAgICAgICAgICAgIGJpdCxcbiAgICAgICAgICAgIGxvZ0NoYW5uZWxTdGF0ZSxcbiAgICAgICAgICAgIGxvZ0FsbENoYW5uZWxTdGF0ZVxuICAgICAgICB9XG5cbiAgICB9XG59KVxuXG5cbiIsIlxuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2FwcC5pbXUnLCB7XG5cbiAgICBkZXBzOiBbJ2FwcC5lbXVBZ2MnXSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7Kn0gY29uZmlnIFxuICAgICAqIEBwYXJhbSB7QXBwQWdjLlNlcnZpY2VzLkFHQy5JbnRlcmZhY2V9IGFnYyBcbiAgICAgKiBAcmV0dXJucyBcbiAgICAgKi9cbiAgICBpbml0OiBmdW5jdGlvbiAoY29uZmlnLCBhZ2MpIHtcblxuICAgICAgICBjb25zdCBldmVudCA9IG5ldyBFdmVudEVtaXR0ZXIyKClcblxuXHRcdGNvbnN0IGFicyA9IE1hdGguYWJzO1xuXHRcdGNvbnN0IGZsb29yID0gTWF0aC5mbG9vcjtcblx0XHRjb25zdCBzaW4gPSBNYXRoLnNpbjtcblx0XHRjb25zdCBjb3MgPSBNYXRoLmNvcztcblx0XHRjb25zdCBQSSA9IE1hdGguUEk7XG5cdFx0Y29uc3QgUEkyID0gKDIgKiBQSSlcblx0XHRjb25zdCBERUdfVE9fUkFEID0gKFBJIC8gMTgwKVxuXHRcdGNvbnN0IFJBRF9UT19ERUcgPSAoMTgwIC8gUEkpXG5cblx0XHRjb25zdCBDQV9BTkdMRSA9IDAuMDQzOTQ4XG5cdFx0Y29uc3QgRkFfQU5HTEUgPSAwLjYxNzk4MSAvIDM2MDAuMFxuXHRcdGNvbnN0IEFOR0xFX0lOQ1IgPSAzNjAuMCAvIDMyNzY4XG5cdFx0Y29uc3QgUElQQV9JTkNSID0gMC4wNTg1OyAvLyBtL3MgcGVyIGVhY2ggUElQQSBwdWxzZVxuXG5cblx0XHRsZXQgZXJyb3I7XG5cdFx0bGV0IGltdV9hbmdsZTtcblx0XHRsZXQgcGltdTtcblx0XHRsZXQgcGlwYTtcblx0XHRsZXQgdmVsb2NpdHk7XG5cdFx0bGV0IGdpbWJhbExvY2s7XG5cblxuXHRcdGZ1bmN0aW9uIHplcm8oKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnemVybycpXG5cdFx0XHRlcnJvciA9IFswLCAwLCAwXVxuXHRcdFx0aW11X2FuZ2xlID0gWzAsIDAsIDBdXG5cdFx0XHRldWxlciA9IFswLCAwLCAwXVxuXHRcdFx0cGltdSA9IFswLCAwLCAwXVxuXHRcdFx0b21lZ2EgPSBbMCwgMCwgMF1cblx0XHRcdHZlbG9jaXR5ID0gWzAsIDAsIDBdXG5cdFx0XHRwaXBhID0gWzAsIDAsIDBdXG5cdFx0XHRnaW1iYWxMb2NrID0gZmFsc2VcblxuXHRcdFx0dXBkYXRlKClcblxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICAgICAgICAgIGV2ZW50LmVtaXQoJ2RhdGEnLCB7aW11X2FuZ2xlLCBlcnJvcn0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gYWRqdXN0KHgpIHtcblx0XHRcdGxldCByZXQgPSB4XG5cdFx0XHRpZiAoeCA8IDApIHggKz0gMzYwXG5cdFx0XHRpZiAoeCA+PSAzNjApIHggLT0zNjBcblx0XHRcdHJldHVybiB4XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gYWRqdXN0Mih4KSB7XG5cdFx0XHRsZXQgcmV0ID0geFxuXHRcdFx0aWYgKHggPCAtMTgwKSB4ICs9IDM2MFxuXHRcdFx0aWYgKHggPiAxODApIHggLT0zNjBcblx0XHRcdHJldHVybiB4XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gYWRqdXN0Myh4KSB7XG5cdFx0XHRsZXQgcmV0ID0geFxuXHRcdFx0aWYgKHggPCAtUEkyKSB4ICs9IFBJMlxuXHRcdFx0aWYgKHggPj0gUEkyKSB4IC09IFBJMlxuXHRcdFx0cmV0dXJuIHhcblx0XHR9XG5cblxuXHRcdC8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cdFx0Ly8qKiogRnVuY3Rpb246IE1vZGlmeSBhIHNwZWNpZmljIElNVSBEZWx0YSBHaW1iYWwtQW5nbGUgcGFyMT1YOyBwYXIyPVk7IHBhcjM9WiAgICAgICAgICAgICAgICoqKipcblx0XHQvLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXHRcdGZ1bmN0aW9uIG1vZGlmeUdpbWJhbEFuZ2xlKGRlbHRhKSB7XG5cdFx0XHRpZiAoZ2ltYmFsTG9jaykgcmV0dXJuO1xuXHRcdFx0bGV0IGFuZ19kZWx0YSA9IDA7XG5cblx0XHRcdGZvciAobGV0IGF4aXMgPSAwOyBheGlzIDwgMzsgYXhpcysrKSB7XG5cdFx0XHRcdGlmIChkZWx0YVtheGlzXSkge1xuXHRcdFx0XHRcdC8vIC0tLS0gQ2FsY3VsYXRlIE5ldyBBbmdsZSAtLS0tXG5cdFx0XHRcdFx0aW11X2FuZ2xlW2F4aXNdID0gYWRqdXN0KGRlbHRhW2F4aXNdICsgaW11X2FuZ2xlW2F4aXNdKVxuXG5cdFx0XHRcdFx0Ly8gLS0tLSBDYWxjdWxhdGUgRGVsdGEgYmV0d2VlbiB0aGUgbmV3IEFuZ2xlIGFuZCBhbHJlYWR5IGZlZWRlZCBJTVUgQW5nbGUgLS0tLVxuXHRcdFx0XHRcdGNvbnN0IGR4ID0gYWRqdXN0MihpbXVfYW5nbGVbYXhpc10gLSBwaW11W2F4aXNdKVxuXG5cdFx0XHRcdFx0Ly8gLS0tLSBGZWVkIHlhQUdDIHdpdGggdGhlIG5ldyBBbmd1bGFyIERlbHRhIC0tLS1cblx0XHRcdFx0XHRjb25zdCBzaWduID0gZHggPiAwID8gKzEgOiAtMTtcblx0XHRcdFx0XHRsZXQgbiA9IGZsb29yKGFicyhkeCkgLyBBTkdMRV9JTkNSKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ24nLCBuKVxuXHRcdFx0XHRcdHBpbXVbYXhpc10gPSBhZGp1c3QocGltdVtheGlzXSArIHNpZ24gKiBBTkdMRV9JTkNSICogbik7XG5cblx0XHRcdFx0XHRsZXQgY2R1ID0gYWdjLnBlZWsoMjYgKyBheGlzKTsgICAgICAgICAgICAgICAgICAgICAgICAvLyByZWFkIENEVSBjb3VudGVyICgyNiA9IDB4MzIgPSBDRFVYKVxuXHRcdFx0XHRcdGNkdSA9IGNkdSAmIDB4NDAwMCA/IC0oY2R1IF4gMHg3RkZGKSA6IGNkdTsgICAgIC8vIGNvbnZlcnRzIGZyb20gb25lcy1jb21wbGVtZW50IHRvIHR3b3MtY29tcGxlbWVudFxuXHRcdFx0XHRcdGNkdSArPSBzaWduICogbjsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFkZHMgdGhlIG51bWJlciBvZiBwdWxzZXMgXG5cdFx0XHRcdFx0YWdjLnBva2UoMjYgKyBheGlzLCBjZHUgPCAwID8gKC1jZHUpIF4gMHg3RkZGIDogY2R1KTsgICAvLyBjb252ZXJ0cyBiYWNrIHRvIG9uZXMtY29tcGxlbWVudCBhbmQgd3JpdGVzIHRoZSBjb3VudGVyXG5cdFx0XHRcdFx0Ly8gZm9yKDtuPjA7IG4tLSl7ICAgICAgICAgICAgICAgIFxuXHRcdFx0XHRcdC8vICAgIGFnYy53cml0ZUlvKDB4OUErYXhpcywgc2lnbj4wID8gUENEVV9GQVNUIDogTUNEVV9GQVNULCApOyAgLy8gMHg5QSA9IDAyMzIgPSAwMjAwICsgMDMyIFxuXHRcdFx0XHRcdC8vIH0gICAgICAgICAgICAgICAgICBcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0Lypcblx0XHRcdGlmKGltdV9hbmdsZVsyXSA+IDg1LjEqREVHX1RPX1JBRCAmJiBpbXVfYW5nbGVbMl0gPCAyNzQuOSpERUdfVE9fUkFEKXtcblx0XHRcdFx0Z2ltYmFsTG9jayA9IHRydWU7ICAgICAgICAgICAgICAgIFxuXHRcdFx0fVxuXHRcdFx0Ki9cblx0XHR9XG5cblx0XHQvLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXHRcdC8vKioqKiBGdW5jdGlvbjogR3lybyBDb2Fyc2UgQWxpZ24gKHdpbGwgYmUgY2FsbGVkIGluIGNhc2Ugb2YgQ2hhbm5lbCAwMTc0OyAwMTc1OyAwMTc2IG91dHB1dCkgKioqXG5cdFx0Ly8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblx0XHRmdW5jdGlvbiBneXJvQ29hcnNlQWxpZ24oY2hhbiwgdmFsKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdneXJvX2NvYXJzZV9hbGlnbicsIHtjaGFuLCB2YWx9KVxuXHRcdFx0Y29uc3Qgc2lnbiA9IHZhbCAmIDB4NDAwMCA/IC0xIDogKzE7XG5cdFx0XHRjb25zdCBjZHVfcHVsc2VzID0gc2lnbiAqICh2YWwgJiAweDNGRkYpO1xuXG5cdFx0XHQvLyAtLS0tIENvYXJzZSBBbGlnbiBFbmFibGUgLS0tLVxuXHRcdFx0aWYgKGFnYy5nZXRDaGFubmVsQml0U3RhdGUoMG8xMiwgNCkgPT0gMSkgeyAgICAvLyB7JGJvKDEyLDQpID09IDF9XG5cdFx0XHRcdGlmIChjaGFuID09PSAxMjQpIHsgIC8vIDAxNzRcblx0XHRcdFx0XHRtb2RpZnlHaW1iYWxBbmdsZShbY2R1X3B1bHNlcyAqIENBX0FOR0xFLCAwLCAwXSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAoY2hhbiA9PT0gMTI1KSB7ICAvLyAwMTc1XG5cdFx0XHRcdFx0bW9kaWZ5R2ltYmFsQW5nbGUoWzAsIGNkdV9wdWxzZXMgKiBDQV9BTkdMRSwgMF0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKGNoYW4gPT09IDEyNikgeyAgLy8gMDE3NlxuXHRcdFx0XHRcdG1vZGlmeUdpbWJhbEFuZ2xlKFswLCAwLCBjZHVfcHVsc2VzICogQ0FfQU5HTEVdKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHVwZGF0ZSgpXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyAtLS0tIEVycm9yIE5lZWRsZXMgLS0tLVxuXHRcdFx0XHRlcnJvcltjaGFuIC0gMTI0XSArPSBjZHVfcHVsc2VzO1xuXHRcdFx0fVxuXHRcdH1cblxuXG5cdFx0Ly8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cdFx0Ly8qKiogRnVuY3Rpb246IEd5cm8gRmluZSBBbGlnbiAod2lsbCBiZSBjYWxsZWQgaW4gY2FzZSBvZiBDaGFubmVsIDAxNzcgb3V0cHV0KSAgICAgICAgICAgKioqXG5cdFx0Ly8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cdFx0ZnVuY3Rpb24gZ3lyb0ZpbmVBbGlnbihjaGFuLCB2YWwpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ2d5cm9fZmluZV9hbGlnbicsIGNoYW4sIHZhbClcblxuXG5cdFx0XHRjb25zdCBneXJvX3NpZ25fbWludXMgPSB2YWwgJiAweDQwMDA7XG5cdFx0XHRjb25zdCBneXJvX3NlbGVjdGlvbl9hID0gdmFsICYgMHgyMDAwO1xuXHRcdFx0Y29uc3QgZ3lyb19zZWxlY3Rpb25fYiA9IHZhbCAmIDB4MTAwMDtcblx0XHRcdGNvbnN0IGd5cm9fZW5hYmxlID0gdmFsICYgMHgwODAwO1xuXHRcdFx0Y29uc3Qgc2lnbiA9IGd5cm9fc2lnbl9taW51cyA/IC0xIDogKzE7XG5cdFx0XHRjb25zdCBneXJvX3B1bHNlcyA9IHNpZ24gKiAodmFsICYgMHgwN0ZGKTtcblxuXHRcdFx0aWYgKCFneXJvX3NlbGVjdGlvbl9hICYmIGd5cm9fc2VsZWN0aW9uX2IpIHtcblx0XHRcdFx0bW9kaWZ5R2ltYmFsQW5nbGUoW2d5cm9fcHVsc2VzICogRkFfQU5HTEUsIDAsIDBdKTtcblx0XHRcdH1cblx0XHRcdGlmIChneXJvX3NlbGVjdGlvbl9hICYmICFneXJvX3NlbGVjdGlvbl9iKSB7XG5cdFx0XHRcdG1vZGlmeUdpbWJhbEFuZ2xlKFswLCBneXJvX3B1bHNlcyAqIEZBX0FOR0xFLCAwXSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoZ3lyb19zZWxlY3Rpb25fYSAmJiBneXJvX3NlbGVjdGlvbl9iKSB7XG5cdFx0XHRcdG1vZGlmeUdpbWJhbEFuZ2xlKFswLCAwLCBneXJvX3B1bHNlcyAqIEZBX0FOR0xFXSk7XG5cdFx0XHR9XG5cblx0XHRcdHVwZGF0ZSgpXG5cdFx0fVxuXG5cdFx0Ly8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXHRcdC8vKioqIEZ1bmN0aW9uOiBUcmFuc2Zvcm0gYW5ndWxhciBkZWx0YXMgaW4gQm9keSBBeGVzIGludG8gU3RhYmxlIE1lbWJlciBhbmd1bGFyIGRlbHRhcyAgICAgICAqKipcblx0XHQvLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cdFx0ZnVuY3Rpb24gcm90YXRlKGRlbHRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdyb3RhdGUnLCBkZWx0YSlcblxuXHRcdFx0Y29uc3QgZHAgPSBkZWx0YVswXSAqIERFR19UT19SQURcblx0XHRcdGNvbnN0IGRxID0gZGVsdGFbMV0gKiBERUdfVE9fUkFEXG5cdFx0XHRjb25zdCBkciA9IGRlbHRhWzJdICogREVHX1RPX1JBRFxuXG5cdFx0XHRjb25zdCBJTVVYX0FOR0xFX2IgPSBpbXVfYW5nbGVbMF0gKiBERUdfVE9fUkFEXG5cdFx0XHRjb25zdCBJTVVZX0FOR0xFX2IgPSBpbXVfYW5nbGVbMV0gKiBERUdfVE9fUkFEXG5cdFx0XHRjb25zdCBJTVVaX0FOR0xFX2IgPSBpbXVfYW5nbGVbMl0gKiBERUdfVE9fUkFEXHRcdFx0XG5cblx0XHRcdGNvbnN0IE1QSSA9IHNpbihJTVVaX0FOR0xFX2IpO1xuXHRcdFx0Y29uc3QgTVFJID0gY29zKElNVVpfQU5HTEVfYikgKiBjb3MoSU1VWF9BTkdMRV9iKTtcblx0XHRcdGNvbnN0IE1RTSA9IHNpbihJTVVYX0FOR0xFX2IpO1xuXHRcdFx0Y29uc3QgTVJJID0gLWNvcyhJTVVaX0FOR0xFX2IpICogc2luKElNVVhfQU5HTEVfYik7XG5cdFx0XHRjb25zdCBNUk0gPSBjb3MoSU1VWF9BTkdMRV9iKTtcblx0XHRcdGNvbnN0IG5lbm5lciA9IE1STSAqIE1RSSAtIE1SSSAqIE1RTTtcblxuXHRcdFx0Ly8tLS0tIENhbGN1bGF0ZSBBbmd1bGFyIENoYW5nZSAtLS0tXG5cdFx0XHRjb25zdCBkb19iID0gYWRqdXN0MyhkcCAtIChkcSAqIE1STSAqIE1QSSAtIGRyICogTVFNICogTVBJKSAvIG5lbm5lcik7XG5cdFx0XHRjb25zdCBkaV9iID0gYWRqdXN0MygoZHEgKiBNUk0gLSBkciAqIE1RTSkgLyBuZW5uZXIpO1xuXHRcdFx0Y29uc3QgZG1fYiA9IGFkanVzdDMoKGRyICogTVFJIC0gZHEgKiBNUkkpIC8gbmVubmVyLCAtUEksIFBJKTtcblxuXHRcdFx0Ly8tLS0gUmFkIHRvIERlZyBhbmQgY2FsbCBvZiBHaW1iYWwgQW5nbGUgTW9kaWZpY2F0aW9uIC0tLS1cblx0XHRcdG1vZGlmeUdpbWJhbEFuZ2xlKFtkb19iICogUkFEX1RPX0RFRywgZGlfYiAqIFJBRF9UT19ERUcsIGRtX2IgKiBSQURfVE9fREVHXSk7XG5cdFx0fVxuXG5cdFx0Ly8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblx0XHQvLyoqKiBGdW5jdGlvbjogTW9kaWZ5IFBJUEEgVmFsdWVzIHRvIG1hdGNoIHNpbXVsYXRlZCBTcGVlZCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKioqKlxuXHRcdC8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cdFx0ZnVuY3Rpb24gYWNjZWxlcmF0ZShkZWx0YSkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnYWNjZWxlcmF0ZScsIGRlbHRhKVxuXG5cdFx0XHRjb25zdCBPR0EgPSBpbXVfYW5nbGVbMF0gKiBERUdfVE9fUkFEXG5cdFx0XHRjb25zdCBJR0EgPSBpbXVfYW5nbGVbMV0gKiBERUdfVE9fUkFEXG5cdFx0XHRjb25zdCBNR0EgPSBpbXVfYW5nbGVbMl0gKiBERUdfVE9fUkFEXG5cblxuXHRcdFx0Ly8gYmFzZWQgb24gcHJvYyBtb2RpZnlfcGlwYVhZWiBcblx0XHRcdGNvbnN0IHNpbk9HID0gc2luKE9HQSk7XG5cdFx0XHRjb25zdCBzaW5JRyA9IHNpbihJR0EpO1xuXHRcdFx0Y29uc3Qgc2luTUcgPSBzaW4oTUdBKTtcblx0XHRcdGNvbnN0IGNvc09HID0gY29zKE9HQSk7XG5cdFx0XHRjb25zdCBjb3NJRyA9IGNvcyhJR0EpO1xuXHRcdFx0Y29uc3QgY29zTUcgPSBjb3MoTUdBKTtcblxuXHRcdFx0Y29uc3QgZGVsdGFWWCA9IGNvc01HICogY29zSUcgKiBkZWx0YVswXSArICgtY29zT0cgKiBzaW5NRyAqIGNvc0lHICsgc2luT0cgKiBzaW5JRykgKiBkZWx0YVsxXSArIChzaW5PRyAqIHNpbk1HICogY29zSUcgKyBjb3NPRyAqIHNpbklHKSAqIGRlbHRhWzJdXG5cblx0XHRcdGNvbnN0IGRlbHRhVlkgPSBzaW5NRyAqIGRlbHRhWzBdICsgY29zT0cgKiBjb3NNRyAqIGRlbHRhWzFdIC0gc2luT0cgKiBjb3NNRyAqIGRlbHRhWzJdXG5cblx0XHRcdGNvbnN0IGRlbHRhVlogPSAtY29zTUcgKiBzaW5JRyAqIGRlbHRhWzBdICsgKGNvc09HICogc2luTUcgKiBzaW5JRyArIHNpbk9HICogY29zSUcpICogZGVsdGFbMV0gKyAoLXNpbk9HICogc2luTUcgKiBzaW5JRyArIGNvc09HICogY29zSUcpICogZGVsdGFbMl1cblxuXHRcdFx0Y29uc3QgZHYgPSBbZGVsdGFWWCwgZGVsdGFWWSwgZGVsdGFWWl1cblxuXHRcdFx0Zm9yIChsZXQgYXhpcyA9IDA7IGF4aXMgPCAzOyBheGlzKyspIHtcblx0XHRcdFx0dmVsb2NpdHlbYXhpc10gKz0gZHZbYXhpc107XG5cdFx0XHRcdGNvbnN0IGNvdW50cyA9IGZsb29yKCh2ZWxvY2l0eVtheGlzXSAtIHBpcGFbYXhpc10gKiBQSVBBX0lOQ1IpIC8gUElQQV9JTkNSKTtcblxuXHRcdFx0XHRwaXBhW2F4aXNdICs9IGNvdW50cztcblx0XHRcdFx0Lypcblx0XHRcdFx0Zm9yKDsgY291bnRzID4gMDsgY291bnRzLS0pe1xuXHRcdFx0XHRcdHNlbmRQb3J0KDB4OUYrYXhpcywgUElOQywgMHhGRkZGKTsgICAgICAgICAgLy8gMHg5RiA9IDAyMzcgPSAwMjAwICsgMDM3IFxuXHRcdFx0XHR9XG5cdFx0XHRcdGZvcig7IGNvdW50cyA8IDA7IGNvdW50cysrKXtcblx0XHRcdFx0XHRzZW5kUG9ydCgweDlGK2F4aXMsIE1JTkMsIDB4RkZGRik7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ki9cblx0XHRcdFx0bGV0IHAgPSBhZ2MucGVlaygzMSArIGF4aXMpOyAgICAgICAgICAgICAgICAgICAgICAvLyByZWFkIFBJUEEgY291bnRlciAoMzEgPSAweDM3ID0gUElQQVgpXG5cdFx0XHRcdHAgPSBwICYgMHg0MDAwID8gLShwIF4gMHg3RkZGKSA6IHA7ICAgICAgICAgLy8gY29udmVydHMgZnJvbSBvbmVzLWNvbXBsZW1lbnQgdG8gdHdvcy1jb21wbGVtZW50ICAgICAgICAgICAgICAgIFxuXHRcdFx0XHRwICs9IGNvdW50czsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFkZHMgdGhlIG51bWJlciBvZiBwdWxzZXMgICAgICAgICAgICAgICAgIFxuXHRcdFx0XHRhZ2MucG9rZSgzMSArIGF4aXMsIHAgPCAwID8gKC1wKSBeIDB4N0ZGRiA6IHApO1xuXHRcdFx0fVxuXHRcdH1cblxuICAgICAgICB6ZXJvKClcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcm90YXRlLFxuICAgICAgICAgICAgYWNjZWxlcmF0ZSxcbiAgICAgICAgICAgIGd5cm9Db2Fyc2VBbGlnbixcbiAgICAgICAgICAgIHplcm8sXG4gICAgICAgICAgICBneXJvRmluZUFsaWduLFxuICAgICAgICAgICAgb246IGV2ZW50Lm9uLmJpbmQoZXZlbnQpICAgICAgICAgICAgXG4gICAgICAgIH1cbiAgICB9XG59KTsiLCIvLyBAdHMtY2hlY2tcblxuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ0RTS1knLCB7XG5cblx0dGVtcGxhdGU6IFwiXFxuPGRpdiBjbGFzcz1cXFwidG9wXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwibGVmdFxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjb2xcXFwiPlxcbiAgICAgICAgICAgIDxkaXYgYm4tc3R5bGU9XFxcInVwbGlua19hY3R5XFxcIj48c3Bhbj5VUExJTksgQUNUWTwvc3Bhbj48L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGJuLXN0eWxlPVxcXCJub19hdHRcXFwiPk5PIEFUVDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgYm4tc3R5bGU9XFxcInN0YnlcXFwiPlNUQlk8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGJuLXN0eWxlPVxcXCJrZXlfcmVsXFxcIj5LRVkgUkVMPC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBibi1zdHlsZT1cXFwib3ByX2VyclxcXCI+T1BSIEVSUjwvZGl2PlxcbiAgICAgICAgICAgIDxkaXY+PC9kaXY+XFxuICAgICAgICAgICAgPGRpdj48L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiY29sXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGJuLXN0eWxlPVxcXCJ0ZW1wXFxcIj5URU1QPC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBibi1zdHlsZT1cXFwiZ2ltYmFsbF9sb2NrXFxcIj48c3Bhbj5HSU1CQUxMIExPQ0s8L3NwYW4+PC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBibi1zdHlsZT1cXFwicHJvZ1xcXCI+UFJPRzwvZGl2PlxcbiAgICAgICAgICAgIDxkaXY+UkVTVEFSVDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgYm4tc3R5bGU9XFxcInRyYWNrZXJcXFwiPlRSQUNLRVI8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGJuLXN0eWxlPVxcXCJhbHRcXFwiPkFMVDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgYm4tc3R5bGU9XFxcInZlbFxcXCI+VkVMPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG5cXG4gICAgXFxuICAgIDwvZGl2PlxcbiAgICBcXG4gICAgXFxuICAgIDxkaXYgY2xhc3M9XFxcInJpZ2h0XFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImxpbmVcXFwiPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImNvbXBBY3R5XFxcIiBibi1zdHlsZT1cXFwiY29tcF9hY3R5XFxcIj48c3Bhbj5DT01QIEFDVFk8L3NwYW4+PC9kaXY+XFxuICAgICAgICAgICAgPGRpdj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwibGFiZWxcXFwiPlBST0c8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZGlnaXRcXFwiIGJuLWh0bWw9XFxcInByb2cwMFxcXCI+PC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgIFxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJsaW5lXFxcIj5cXG4gICAgICAgICAgICA8ZGl2PlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJsYWJlbFxcXCI+VkVSQjwvZGl2PlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkaWdpdFxcXCIgYm4taHRtbD1cXFwidmVyYjAwXFxcIj48L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2PlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJsYWJlbFxcXCI+Tk9VTjwvZGl2PlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkaWdpdFxcXCIgYm4taHRtbD1cXFwibm91bjAwXFxcIj48L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZGlnaXQgYmlnXFxcIiBibi1odG1sPVxcXCJyMVxcXCI+PC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkaWdpdCBiaWdcXFwiIGJuLWh0bWw9XFxcInIyXFxcIj48L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImRpZ2l0IGJpZ1xcXCIgYm4taHRtbD1cXFwicjNcXFwiPjwvZGl2PlxcbiAgICBcXG4gICAgPC9kaXY+XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwiYm90dG9tXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwia2V5Ym9hcmRcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5rZXk6IG9uS2V5XFxcIj5cXG4gICAgICAgIDxkaXY+XFxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwibGFiZWwga2V5XFxcIj5WRVJCPC9idXR0b24+XFxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwibGFiZWwga2V5XFxcIj5OT1VOPC9idXR0b24+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXY+XFxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwia2V5XFxcIj4rPC9idXR0b24+XFxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwia2V5XFxcIj4tPC9idXR0b24+XFxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwia2V5XFxcIj4wPC9idXR0b24+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXY+XFxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwia2V5XFxcIj4xPC9idXR0b24+XFxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwia2V5XFxcIj40PC9idXR0b24+XFxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwia2V5XFxcIj43PC9idXR0b24+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXY+XFxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwia2V5XFxcIj44PC9idXR0b24+XFxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwia2V5XFxcIj41PC9idXR0b24+XFxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwia2V5XFxcIj4yPC9idXR0b24+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXY+XFxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwia2V5XFxcIj45PC9idXR0b24+XFxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwia2V5XFxcIj42PC9idXR0b24+XFxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwia2V5XFxcIj4zPC9idXR0b24+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXY+XFxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwibGFiZWwga2V5XFxcIj5DTFI8L2J1dHRvbj5cXG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJsYWJlbCBrZXlcXFwiPlBSTzwvYnV0dG9uPlxcbiAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcImxhYmVsIGtleVxcXCI+S0VZIFJFTDwvYnV0dG9uPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2PlxcbiAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcImxhYmVsIGtleVxcXCI+RU5UUjwvYnV0dG9uPlxcbiAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcImxhYmVsIGtleVxcXCI+UlNFVDwvYnV0dG9uPlxcbiAgICAgICAgPC9kaXY+XFxuICAgIFxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cXG5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnBhZ2VyJywgJ2FwcC5lbXVBZ2MnXSxcblxuXHRwcm9wczoge1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5QYWdlci5JbnRlcmZhY2V9IHBhZ2VyIFxuXHQgKiBAcGFyYW0ge0FwcEFnYy5TZXJ2aWNlcy5BR0MuSW50ZXJmYWNlfSBhZ2Ncblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHBhZ2VyLCBhZ2MpIHtcblxuXHRcdGNvbnN0IGtleU1hcHBpbmcgPSB7XG5cdFx0XHQnVkVSQic6IDE3LFxuXHRcdFx0J05PVU4nOiAzMSxcblx0XHRcdCcrJzogMjYsXG5cdFx0XHQnLSc6IDI3LFxuXHRcdFx0JzAnOiAxNixcblx0XHRcdCdDTFInOiAzMCxcblx0XHRcdCdLRVkgUkVMJzogMjUsXG5cdFx0XHQnRU5UUic6IDI4LFxuXHRcdFx0J1JTRVQnOiAxOFxuXHRcdH1cblxuXHRcdGNvbnN0IGJpdCA9IGFnYy5iaXRcblxuXHRcdGZ1bmN0aW9uIGdldERpZ2l0KGMpIHtcblx0XHRcdHZhciBkID0gJ0UnO1xuXHRcdFx0c3dpdGNoIChjKSB7XG5cdFx0XHRcdGNhc2UgMDogZCA9ICdIJzsgYnJlYWs7XG5cdFx0XHRcdGNhc2UgMjE6IGQgPSAnMCc7IGJyZWFrO1xuXHRcdFx0XHRjYXNlIDM6IGQgPSAnMSc7IGJyZWFrO1xuXHRcdFx0XHRjYXNlIDI1OiBkID0gJzInOyBicmVhaztcblx0XHRcdFx0Y2FzZSAyNzogZCA9ICczJzsgYnJlYWs7XG5cdFx0XHRcdGNhc2UgMTU6IGQgPSAnNCc7IGJyZWFrO1xuXHRcdFx0XHRjYXNlIDMwOiBkID0gJzUnOyBicmVhaztcblx0XHRcdFx0Y2FzZSAyODogZCA9ICc2JzsgYnJlYWs7XG5cdFx0XHRcdGNhc2UgMTk6IGQgPSAnNyc7IGJyZWFrO1xuXHRcdFx0XHRjYXNlIDI5OiBkID0gJzgnOyBicmVhaztcblx0XHRcdFx0Y2FzZSAzMTogZCA9ICc5JzsgYnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZDtcblx0XHR9XG5cblx0XHRsZXQgc2lnbjFwID0gMFxuXHRcdGxldCBzaWduMW0gPSAwXG5cdFx0bGV0IHNpZ24ycCA9IDBcblx0XHRsZXQgc2lnbjJtID0gMFxuXHRcdGxldCBzaWduM3AgPSAwXG5cdFx0bGV0IHNpZ24zbSA9IDBcblxuXG5cdFx0Y29uc3Qgc3BhY2UgPSAnJm5ic3A7J1xuXG5cdFx0ZnVuY3Rpb24gZ2V0Q29sb3IodmFsdWUpIHtcblx0XHRcdHJldHVybiB7ICdiYWNrZ3JvdW5kLWNvbG9yJzogdmFsdWUgPyAnI2ZmYzIwMCcgOiAnIzg4ODg4OCcgfVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldENvbG9yMih2YWx1ZSkge1xuXHRcdFx0cmV0dXJuIHsgJ2JhY2tncm91bmQtY29sb3InOiB2YWx1ZSA/ICcjZmZmZmZmJyA6ICcjODg4ODg4JyB9XG5cdFx0fVxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRmbGFzaF9mbGFnOiBmYWxzZSxcblx0XHRcdFx0c3RhdHVzMTE6IDAsXG5cdFx0XHRcdHN0YXR1czEzOiAwLFxuXHRcdFx0XHRzdGF0dXMxMDogMCwgLy8gc3RhdHVzIGJpdHMgb2YgQUdDIG91dHB1dCBjaGFubmVsIDAxMFxuXHRcdFx0XHRkaWdpdHM6ICcwMDAwMDArMDAwMDArMDAwMDArMDAwMDAnLFxuXHRcdFx0XHRjb21wX2FjdHk6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gZ2V0Q29sb3IoYml0KHRoaXMuc3RhdHVzMTEsIDIpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHR1cGxpbmtfYWN0eTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiBnZXRDb2xvcjIoYml0KHRoaXMuc3RhdHVzMTEsIDMpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHR0ZW1wOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGdldENvbG9yKGJpdCh0aGlzLnN0YXR1czExLCA0KSlcblx0XHRcdFx0fSxcblx0XHRcdFx0a2V5X3JlbDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiBnZXRDb2xvcjIoYml0KHRoaXMuc3RhdHVzMTEsIDUpICYmIHRoaXMuZmxhc2hfZmxhZylcblx0XHRcdFx0fSxcblx0XHRcdFx0b3ByX2VycjogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiBnZXRDb2xvcjIoYml0KHRoaXMuc3RhdHVzMTEsIDcpICYmIHRoaXMuZmxhc2hfZmxhZylcblx0XHRcdFx0fSxcblx0XHRcdFx0c3RieTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiBnZXRDb2xvcjIoYml0KHRoaXMuc3RhdHVzMTMsIDExKSlcblx0XHRcdFx0fSxcblx0XHRcdFx0dmVsOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGdldENvbG9yKGJpdCh0aGlzLnN0YXR1czEwLCAzKSlcblx0XHRcdFx0fSxcblx0XHRcdFx0bm9fYXR0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGdldENvbG9yMihiaXQodGhpcy5zdGF0dXMxMCwgNCkpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGFsdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiBnZXRDb2xvcihiaXQodGhpcy5zdGF0dXMxMCwgNSkpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdpbWJhbGxfbG9jazogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiBnZXRDb2xvcihiaXQodGhpcy5zdGF0dXMxMCwgNikpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHRyYWNrZXI6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gZ2V0Q29sb3IoYml0KHRoaXMuc3RhdHVzMTAsIDgpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRwcm9nOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGdldENvbG9yKGJpdCh0aGlzLnN0YXR1czEwLCA5KSlcblx0XHRcdFx0fSxcblx0XHRcdFx0cjE6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5kaWdpdHMuc2xpY2UoNiwgMTIpLnJlcGxhY2UoL0gvZywgc3BhY2UpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHIyOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuZGlnaXRzLnNsaWNlKDEyLCAxOCkucmVwbGFjZSgvSC9nLCBzcGFjZSlcblx0XHRcdFx0fSxcblx0XHRcdFx0cHJvZzAwOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuZGlnaXRzLnNsaWNlKDAsIDIpLnJlcGxhY2UoL0gvZywgc3BhY2UpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHIzOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuZGlnaXRzLnNsaWNlKDE4LCAyNCkucmVwbGFjZSgvSC9nLCBzcGFjZSlcblx0XHRcdFx0fSxcblx0XHRcdFx0dmVyYjAwOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0aWYgKGJpdCh0aGlzLnN0YXR1czExLCA2KSAmJiAhdGhpcy5mbGFzaF9mbGFnKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc3BhY2UgKyBzcGFjZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5kaWdpdHMuc2xpY2UoMiwgNCkucmVwbGFjZSgvSC9nLCBzcGFjZSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG5vdW4wMDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGlmIChiaXQodGhpcy5zdGF0dXMxMSwgNikgJiYgIXRoaXMuZmxhc2hfZmxhZykge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHNwYWNlICsgc3BhY2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuZGlnaXRzLnNsaWNlKDQsIDYpLnJlcGxhY2UoL0gvZywgc3BhY2UpXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25LZXk6IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdGNvbnN0IHRleHQgPSAkKHRoaXMpLnRleHQoKVxuXHRcdFx0XHRcdGxldCB2YWwgPSBrZXlNYXBwaW5nW3RleHRdXG5cdFx0XHRcdFx0aWYgKHZhbCA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdHZhbCA9IHBhcnNlSW50KHRleHQpXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0ZXYuc3RvcFByb3BhZ2F0aW9uKClcblx0XHRcdFx0XHRlbHQudHJpZ2dlcigna2V5JywgeyB2YWwgfSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblxuXG5cdFx0dGhpcy5wcm9jZXNzTGlnaHRzID0gZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdwcm9jZXNzTGlnaHRzJywgdmFsdWUudG9TdHJpbmcoMikpXG5cdFx0XHRjdHJsLnNldERhdGEoeyBsYW1wczogdmFsdWUgfSlcblx0XHR9XG5cblx0XHR0aGlzLnNldERhdGEgPSBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdzZXREYXRhJywgZGF0YSlcblx0XHRcdGN0cmwuc2V0RGF0YShkYXRhKVxuXHRcdH1cblxuXHRcdHRoaXMucHJvY2VzcyA9IGZ1bmN0aW9uIChjaGFubmVsLCB2YWx1ZSkge1xuXHRcdFx0aWYgKGNoYW5uZWwgPT0gMG8xMCAmJiB2YWx1ZSA9PSAwKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXG5cdFx0XHQvL2NvbnNvbGUubG9nKCdwcm9jZXNzJywgY2hhbm5lbC50b1N0cmluZyg4KSwgdmFsdWUpXG5cblx0XHRcdGlmIChjaGFubmVsID09IDBvMTEpIHtcblx0XHRcdFx0Y3RybC5zZXREYXRhKHtzdGF0dXMxMTogdmFsdWV9KVxuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblxuXG5cdFx0XHRpZiAoY2hhbm5lbCA9PSAwbzEzKSB7XG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7c3RhdHVzMTM6IHZhbHVlfSlcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cblx0XHRcdC8qXG5cdFx0XHRcdFRoZSAxNS1iaXQgY29kZSBvdXRwdXQgaW4gaS9vIGNoYW5uZWwgMTAgKG9jdGFsKSBjYW4gYmUgcmVwcmVzZW50ZWQgaW4gYml0LWZpZWxkcyBhcyBBQUFBQkNDQ0NDREREREQgd2hlcmVcblx0XHRcdFx0QUFBQSBpbmRpY2F0ZXMgdGhlIGRpZ2l0LXBhaXJcblx0XHRcdFx0XHQxMTogUFJPR1xuXHRcdFx0XHRcdDEwOiBWRVJCXG5cdFx0XHRcdFx0OSA6IE5PVU5cblx0XHRcdFx0XHQ4KEQpLCA3LCA2OiBSRUcxICg1IGRpZ2l0cylcblx0XHRcdFx0XHQ1LCA0LCAzKEMpOiBSRUcyXG5cdFx0XHRcdFx0MyhEKSwgMiwgMTogUkVHM1xuXHRcblx0XG5cdFx0XHRcdEIgc2V0cyBvciByZXNldHMgYSArLy0gc2lnbiwgXG5cdFx0XHRcdENDQ0NDIGlzIHRoZSB2YWx1ZSBmb3IgdGhlIGxlZnQtaGFuZCBkaWdpdCBvZiB0aGUgcGFpciwgXG5cdFx0XHRcdEREREREIGlzIHRoZSB2YWx1ZSBmb3IgdGhlIHJpZ2h0LWhhbmQgZGlnaXQgb2YgdGhlIHBhaXIuXG5cdFx0XHQqL1xuXHRcdFx0Y29uc3QgYWEgPSB2YWx1ZSA+PiAxMVxuXHRcdFx0Y29uc3QgYmIgPSAodmFsdWUgPj4gMTApICYgMVxuXHRcdFx0Y29uc3QgY2MgPSBnZXREaWdpdCgodmFsdWUgPj4gNSkgJiAweDFmKVxuXHRcdFx0Y29uc3QgZGQgPSBnZXREaWdpdCh2YWx1ZSAmIDB4MWYpXG5cdFx0XHRjb25zdCBzID0gY3RybC5tb2RlbC5kaWdpdHMuc3BsaXQoJycpXG5cblx0XHRcdHN3aXRjaCAoYWEpIHtcblx0XHRcdFx0Y2FzZSAxMjpcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBzdGF0dXMxMDogdmFsdWUgfSlcblx0XHRcdFx0XHRicmVha1xuXHRcdFx0XHRjYXNlIDExOlxuXHRcdFx0XHRcdHNbMF0gPSBjY1xuXHRcdFx0XHRcdHNbMV0gPSBkZFxuXHRcdFx0XHRcdGJyZWFrXG5cdFx0XHRcdGNhc2UgMTA6XG5cdFx0XHRcdFx0c1syXSA9IGNjXG5cdFx0XHRcdFx0c1szXSA9IGRkXG5cdFx0XHRcdFx0YnJlYWtcblx0XHRcdFx0Y2FzZSA5OlxuXHRcdFx0XHRcdHNbNF0gPSBjY1xuXHRcdFx0XHRcdHNbNV0gPSBkZFxuXHRcdFx0XHRcdGJyZWFrXG5cdFx0XHRcdGNhc2UgODpcblx0XHRcdFx0XHRzWzddID0gZGRcblx0XHRcdFx0XHRicmVha1xuXHRcdFx0XHRjYXNlIDc6XG5cdFx0XHRcdFx0c1s4XSA9IGNjXG5cdFx0XHRcdFx0c1s5XSA9IGRkXG5cdFx0XHRcdFx0c2lnbjFwID0gYmJcblx0XHRcdFx0XHRicmVha1xuXHRcdFx0XHRjYXNlIDY6XG5cdFx0XHRcdFx0c1sxMF0gPSBjY1xuXHRcdFx0XHRcdHNbMTFdID0gZGRcblx0XHRcdFx0XHRzaWduMW0gPSBiYlxuXHRcdFx0XHRcdGJyZWFrXG5cdFx0XHRcdGNhc2UgNTpcblx0XHRcdFx0XHRzWzEzXSA9IGNjXG5cdFx0XHRcdFx0c1sxNF0gPSBkZFxuXHRcdFx0XHRcdHNpZ24ycCA9IGJiXG5cdFx0XHRcdFx0YnJlYWtcblx0XHRcdFx0Y2FzZSA0OlxuXHRcdFx0XHRcdHNbMTVdID0gY2Ncblx0XHRcdFx0XHRzWzE2XSA9IGRkXG5cdFx0XHRcdFx0c2lnbjJtID0gYmJcblx0XHRcdFx0XHRicmVha1xuXHRcdFx0XHRjYXNlIDM6XG5cdFx0XHRcdFx0c1sxN10gPSBjY1xuXHRcdFx0XHRcdHNbMTldID0gZGRcblx0XHRcdFx0XHRicmVha1xuXHRcdFx0XHRjYXNlIDI6XG5cdFx0XHRcdFx0c1syMF0gPSBjY1xuXHRcdFx0XHRcdHNbMjFdID0gZGRcblx0XHRcdFx0XHRzaWduM3AgPSBiYlxuXHRcdFx0XHRcdGJyZWFrXG5cdFx0XHRcdGNhc2UgMTpcblx0XHRcdFx0XHRzWzIyXSA9IGNjXG5cdFx0XHRcdFx0c1syM10gPSBkZFxuXHRcdFx0XHRcdHNpZ24zbSA9IGJiXG5cdFx0XHRcdFx0YnJlYWtcblxuXHRcdFx0fVxuXHRcdFx0aWYgKGFhICE9IDEyKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coeyBhYSwgYmIsIGNjLCBkZCB9KVxuXHRcdFx0XHRzWzZdID0gKHNpZ24xcCAmJiAhc2lnbjFtID8gJysnIDogKCFzaWduMXAgJiYgIXNpZ24xbSA/ICdIJyA6ICctJykpO1xuXHRcdFx0XHRzWzEyXSA9IChzaWduMnAgJiYgIXNpZ24ybSA/ICcrJyA6ICghc2lnbjJwICYmICFzaWduMm0gPyAnSCcgOiAnLScpKTtcblx0XHRcdFx0c1sxOF0gPSAoc2lnbjNwICYmICFzaWduM20gPyAnKycgOiAoIXNpZ24zcCAmJiAhc2lnbjNtID8gJ0gnIDogJy0nKSk7XG5cblx0XHRcdFx0Y29uc3QgZGlnaXRzID0gcy5qb2luKCcnKVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdzJywgZGlnaXRzKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoeyBkaWdpdHMgfSlcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdjaGFubmVsJywgY2hhbm5lbCwgJ3ZhbHVlJywgdmFsdWUudG9TdHJpbmcoMTYpKVxuXHRcdFx0fVxuXG5cblx0XHR9XG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIvLyBAdHMtY2hlY2tcblxuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ0ZEQUknLCB7XG5cblx0dGVtcGxhdGU6IFwiPHN2ZyB3aWR0aD1cXFwiMzUwXFxcIiBoZWlnaHQ9XFxcIjM2MFxcXCIgYm4tYmluZD1cXFwic3ZnXFxcIj5cXG4gICAgPGRlZnM+XFxuICAgICAgPG1hcmtlciBpZD1cXFwidHJpYW5nbGVcXFwiIHZpZXdCb3g9XFxcIjAgMCAxMCAxMFxcXCJcXG4gICAgICAgICAgICByZWZYPVxcXCIxXFxcIiByZWZZPVxcXCI1XFxcIlxcbiAgICAgICAgICAgIG1hcmtlclVuaXRzPVxcXCJzdHJva2VXaWR0aFxcXCJcXG4gICAgICAgICAgICBtYXJrZXJXaWR0aD1cXFwiMTBcXFwiIG1hcmtlckhlaWdodD1cXFwiMTBcXFwiXFxuICAgICAgICAgICAgb3JpZW50PVxcXCJhdXRvXFxcIj5cXG4gICAgICAgIDxwYXRoIGQ9XFxcIk0gMCAwIEwgMTAgNSBMIDAgMTAgelxcXCIgZmlsbD1cXFwiYmxhY2tcXFwiLz5cXG4gICAgICA8L21hcmtlcj5cXG4gICAgICA8bWFya2VyIGlkPVxcXCJ0cmlhbmdsZTJcXFwiIHZpZXdCb3g9XFxcIjAgMCAxNiAxNlxcXCJcXG4gICAgICAgICAgICByZWZYPVxcXCIxXFxcIiByZWZZPVxcXCI4XFxcIlxcbiAgICAgICAgICAgIG1hcmtlclVuaXRzPVxcXCJzdHJva2VXaWR0aFxcXCJcXG4gICAgICAgICAgICBtYXJrZXJXaWR0aD1cXFwiMTZcXFwiIG1hcmtlckhlaWdodD1cXFwiMTZcXFwiXFxuICAgICAgICAgICAgb3JpZW50PVxcXCJhdXRvXFxcIj5cXG4gICAgICAgIDxwYXRoIGQ9XFxcIk0gMCAwIEwgMTYgOCBMIDAgMTYgelxcXCIgZmlsbD1cXFwiYmxhY2tcXFwiLz5cXG4gICAgICA8L21hcmtlcj5cXG4gIFxcbiAgPC9kZWZzPlxcbiAgICBcXG4gIDwvc3ZnPlwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHRcdFxuXHR9LFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5QYWdlci5JbnRlcmZhY2V9IHBhZ2VyIFxuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIpIHtcblxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHQvKipAdHlwZSB7U1ZHRWxlbWVudH0gKi9cblx0XHRjb25zdCBzdmcgPSBjdHJsLnNjb3BlLnN2Zy5nZXQoMClcblxuXG5cblx0XHRjb25zdCBvZmZzZXRYID0gMTUwXG5cdFx0Y29uc3Qgb2Zmc2V0WSA9IDE4MFxuXHRcdGNvbnN0IFJBRF9UT19ERUcgPSAoMTgwIC8gTWF0aC5QSSlcblx0XHRjb25zdCBERUdfVE9fUkFEID0gKE1hdGguUEkgLyAxODApXG5cdFx0XG5cdFx0Y29uc3QgTkVFRExFX1NDQUxFID0gNDIuMTg3NSAvIDM4NC4wXG5cdFx0XG5cdFx0XHRcdFxuXHRcdC8vIGxldCBlcnJvcl94ID0gMFxuXHRcdC8vIGxldCBlcnJvcl95ID0gMFxuXHRcdC8vIGxldCBlcnJvcl96ID0gMFxuXHRcdC8vIGxldCBPbWVnYV9Sb2xsID0gMFxuXHRcdC8vIGxldCBPbWVnYV9QaXRjaCA9IDBcblx0XHQvLyBsZXQgT21lZ2FfWWF3ID0gMFxuXHRcdFx0XHRcblx0XHRmdW5jdGlvbiBzZXRBdHRycyhvYmosIGF0dHJzKSB7XG5cdFx0XHRPYmplY3Qua2V5cyhhdHRycykuZm9yRWFjaCgoYXR0ck5hbWUpID0+IHtcblx0XHRcdFx0b2JqLnNldEF0dHJpYnV0ZShhdHRyTmFtZSwgYXR0cnNbYXR0ck5hbWVdKVxuXHRcdFx0fSlcblx0XHRcblx0XHR9XG5cdFx0XG5cdFx0ZnVuY3Rpb24gY3JlYXRlRWxlbWVudCh0YWdOYW1lLCBhdHRycykge1xuXHRcdFx0Y29uc3Qgb2JqID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsIHRhZ05hbWUpXG5cdFx0XHRpZiAodHlwZW9mIGF0dHJzID09ICdvYmplY3QnKSB7XG5cdFx0XHRcdHNldEF0dHJzKG9iaiwgYXR0cnMpXHRcdFxuXHRcdFx0fVxuXHRcdFx0c3ZnLmFwcGVuZENoaWxkKG9iailcblx0XHRcdHJldHVybiBvYmpcblx0XHR9XG5cdFx0XG5cdFx0ZnVuY3Rpb24gbGluZSh4MSwgeTEsIHgyLCB5MiwgY29sb3IsIGFyZ3MpIHtcblx0XHRcdHJldHVybiBjcmVhdGVFbGVtZW50KCdsaW5lJywgT2JqZWN0LmFzc2lnbih7IHgxLCB5MSwgeDIsIHkyLCBzdHJva2U6IGNvbG9yIH0sIGFyZ3MpKVxuXHRcdH1cblx0XHRcblx0XHRmdW5jdGlvbiB0ZXh0KHgsIHksIHN0ciwgY29sb3IsIGFyZ3MpIHtcblx0XHRcdGNvbnN0IG9iaiA9IGNyZWF0ZUVsZW1lbnQoJ3RleHQnLCBPYmplY3QuYXNzaWduKHsgeCwgeSwgZmlsbDogY29sb3J9LCBhcmdzKSlcblx0XHRcdG9iai50ZXh0Q29udGVudCA9IHN0clxuXHRcdFx0cmV0dXJuIG9ialxuXHRcdH1cblx0XHRcblx0XHRmdW5jdGlvbiBjaXJjbGUoY3gsIGN5LCByLCBjb2xvciwgYXJncykge1xuXHRcdFx0cmV0dXJuIGNyZWF0ZUVsZW1lbnQoJ2NpcmNsZScsIE9iamVjdC5hc3NpZ24oeyByLCBjeCwgY3ksIGZpbGw6IGNvbG9yfSwgYXJncykpXG5cdFx0XG5cdFx0fVxuXHRcdFxuXHRcdGNvbnN0IHdpZGd0TSA9IHt9ICAgIFxuXHRcdFxuXHRcdFxuXHRcdGZ1bmN0aW9uIHNldFgob2JqTmFtZSwgeCkge1xuXHRcdFx0c2V0QXR0cnMod2lkZ3RNW29iak5hbWVdLCB7eDE6IHgsIHgyOiB4fSlcblx0XHR9XG5cdFx0XG5cdFx0ZnVuY3Rpb24gc2V0WShvYmpOYW1lLCB5KSB7XG5cdFx0XHRzZXRBdHRycyh3aWRndE1bb2JqTmFtZV0sIHt5MTogeSwgeTI6IHl9KVxuXHRcdH1cblx0XHRcblx0XHRcblx0XHRmdW5jdGlvbiBzZXRMaW5lKG9iak5hbWUsIHgxLCB5MSwgeDIsIHkyKSB7XG5cdFx0XHRzZXRBdHRycyh3aWRndE1bb2JqTmFtZV0sIHt4MSwgeTEsIHgyLCB5Mn0pXG5cdFx0fVxuXHRcdFxuXHRcdGZ1bmN0aW9uIHNldFBvcyhvYmpOYW1lLCB4LCB5KSB7XG5cdFx0XHRzZXRBdHRycyh3aWRndE1bb2JqTmFtZV0sIHt4LCB5fSlcblx0XHR9XG5cdFx0XG5cdFx0ZnVuY3Rpb24gbWFyayhjeCwgY3ksIHIsIGFuZ2xlLCB3aWR0aCwgY29sb3IpIHtcblx0XHRcdGNvbnN0IGogPSBhbmdsZSAqIE1hdGguUEkgLyAxODBcblx0XHRcdGNvbnN0IHgxID0gY3ggKyByICogTWF0aC5zaW4oailcblx0XHRcdGNvbnN0IHkxID0gY3kgKyByICogTWF0aC5jb3Moailcblx0XHRcdHIgKz0gd2lkdGhcblx0XHRcdGNvbnN0IHgyID0gY3ggKyByICogTWF0aC5zaW4oailcblx0XHRcdGNvbnN0IHkyID0gY3kgKyByICogTWF0aC5jb3Moailcblx0XHRcdHJldHVybiBsaW5lKHgxLCB5MSwgeDIsIHkyLCBjb2xvcilcblx0XHR9XG5cdFx0XG5cdFx0XG5cdFx0XG5cdFx0XG5cdFx0XG5cdFx0Ly8gLS0tLS0tLS0tLS0tLS0tLS0tLSBDcmVhdGUgUGl0Y2ggU2NhbGUgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdFx0XG5cdFx0Zm9yKGxldCBpID0gLTI3MDsgaSA8PSAyNzA7IGkgKz0gMzApIHtcblx0XHRcdGNvbnN0IGNvbCA9ICgoaSA+PSAtMTgwICYmIGkgPD0gMCkgfHwgKGkgPj0gMTgwICYmIGkgPD0gMzYwKSkgPyAnYmxhY2snIDogJ3doaXRlJ1xuXHRcdFx0d2lkZ3RNW2BQSVRDSF8ke2l9YF0gPSBsaW5lKDAsIDAsIDAsIDAsIGNvbClcblx0XHRcdGNvbnN0IGogPSAoaSA8IDApID8gaSArIDM2MCA6IGlcblx0XHRcdHdpZGd0TVtgUElUQ0hfVFhUXyR7aX1gXSA9IHRleHQoMCwgMCwgaiwgY29sKVxuXHRcdFxuXHRcdH1cblx0XHRcblx0XHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLSBDcmVhdGUgWi1BeGlzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHRcdFxuXHRcdHdpZGd0TVsnekF4aXNMTSddID0gbGluZSgwLCAwLCAwLCAwLCAnYmx1ZScpXG5cdFx0XG5cdFx0XG5cdFx0Zm9yKGxldCBpID0gLTI3MDsgaSA8PSAyNzA7IGkgKz0gMzApIHtcblx0XHRcdHdpZGd0TVtgekF4aXNfJHtpfWBdID0gbGluZSgwLCAwLCAwLCAwLCAnYmx1ZScpXG5cdFx0XHRjb25zdCBqID0gKGkgPCAwKSA/IGkgKyAzNjAgOiBpXG5cdFx0XHR3aWRndE1bYHpBeGlzX1RYVF8ke2l9YF0gPSB0ZXh0KDAsIDAsIGosICdibHVlJylcblx0XHRcblx0XHR9XG5cdFx0XG5cdFx0Ly8gLS0tLS0tLS0tLS0tLS0tLS0tLS0gQ3JlYXRlIFJvbGwgSW5kaWNhdG9yIC0tLS0tLS0tLS0tLS0tLVxuXHRcdHdpZGd0TS5Sb2xsTWFya2VyID0gbGluZSgwLCAwLCAwLCAwLCAnYmxhY2snLCB7J21hcmtlci1lbmQnOiAndXJsKCN0cmlhbmdsZTIpJ30pXG5cdFx0Ly9bLmltdS5jMiBjcmVhdGUgbGluZSAwIDAgMCAwIC1maWxsIGJsYWNrIC1hcnJvdyBsYXN0IC1hcnJvd3NoYXBlIHsxOCAxOCA3fV1cblx0XHRcblx0XHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLSBDcmVhdGUgWWF3IEVycm9yIE5lZWRsZSAtLS0tLS0tLS0tLS0tXG5cdFx0d2lkZ3RNLllhd0Vycm9yTmVlZGxlID0gbGluZSgwLCBvZmZzZXRZICsgMTAsIDAsIG9mZnNldFkgKyAxMDAsICdvcmFuZ2UnKVxuXHRcdFxuXHRcdFxuXHRcdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tIENyZWF0ZSBQaXRjaCBFcnJvciBOZWVkbGUgLS0tLS0tLS0tLS1cblx0XHR3aWRndE0uUGl0Y2hFcnJvck5lZWRsZSA9IGxpbmUob2Zmc2V0WCArIDEwLCAwLCBvZmZzZXRYICsgMTAwLCAwLCAnb3JhbmdlJylcblx0XHRcblx0XHRcblx0XHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tIENyZWF0ZSBSb2xsIEVycm9yIE5lZWRsZSAtLS0tLS0tLS0tLS1cblx0XHR3aWRndE0uUm9sbEVycm9yTmVlZGxlID0gbGluZSgwLCBvZmZzZXRZIC0gMTAsIDAsIG9mZnNldFkgLSAxMDAsICdvcmFuZ2UnKVxuXHRcdFxuXHRcdGNpcmNsZShvZmZzZXRYLCBvZmZzZXRZLCAxOTAsICdub25lJywge3N0cm9rZTogJ2RhcmtncmV5JywgJ3N0cm9rZS13aWR0aCc6IDE4MH0pXG5cdFx0XG5cdFx0XG5cdFx0Ly8tLS0tIENyZWF0ZSBSZWQgR2ltYmFsIExvY2sgQXJlYSAtLS0tXG5cdFx0XG5cdFx0XG5cdFx0Zm9yIChsZXQgaSA9IDcwOyBpIDwgMTEwOyBpICs9IDAuNSkge1xuXHRcdFx0bWFyayhvZmZzZXRYLCBvZmZzZXRZLCAxMDAsIGksIDEwLCAncmVkJylcblx0XHR9XG5cdFx0XG5cdFx0Zm9yIChsZXQgaSA9IDI1MDsgaSA8IDI5MDsgaSArPSAwLjUpIHtcblx0XHRcdG1hcmsob2Zmc2V0WCwgb2Zmc2V0WSwgMTAwLCBpLCAxMCwgJ3JlZCcpXG5cdFx0fVxuXHRcdFxuXHRcdC8vIC0tLS0gQ3JlYXRlIFJvbGwgU2NhbGUgLS0tLVxuXHRcdFxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgMzYwOyBpICs9IDEwKSB7XG5cdFx0XHRjb25zdCBtYWcgPSAoKGkgJSAzMCkgPT0gMCkgPyAxMCA6IDE1XG5cdFx0XHRtYXJrKG9mZnNldFgsIG9mZnNldFksIDEwMCwgaSwgbWFnLCAnd2hpdGUnKVxuXHRcdH1cblx0XHRcblx0XHRjaXJjbGUob2Zmc2V0WCwgb2Zmc2V0WSwgMTAwLCAnbm9uZScsIHtzdHJva2U6ICdibGFjaycsICdzdHJva2Utd2lkdGgnOiA0fSlcblx0XHRcdFx0XHRcdFx0XHRcblx0XHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tIENyZWF0ZSBDcm9zcyBNYXJrIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0XHRcblx0XHRsaW5lKG9mZnNldFggLSAxMCwgb2Zmc2V0WSwgb2Zmc2V0WCArIDEwLCBvZmZzZXRZLCAnd2hpdGUnKVxuXHRcdGxpbmUob2Zmc2V0WCwgb2Zmc2V0WSAtIDEwLCBvZmZzZXRYLCBvZmZzZXRZICsgMTAsICd3aGl0ZScpXG5cdFx0XHRcdFxuXHRcdC8vIC0tLS0gQ3JlYXRlIFlhdyBSYXRlIFNjYWxlIGFuZCBQb2ludGVyIC0tLS1cblx0XHRcblx0XHRmb3IgKGxldCBpID0gLTU7IGkgPD0gNTsgaSsrKSB7XG5cdFx0XHRsaW5lKG9mZnNldFggKyAxMCAqIGksIDMxMCwgb2Zmc2V0WCArIDEwICogaSwgMzE1LCAnd2hpdGUnKVxuXHRcdH1cblx0XHRcblx0XHR3aWRndE0uWWF3UmF0ZU1hcmtlciA9IGxpbmUoMCwgMzI1LCAwLCAzMjQsICdibGFjaycsIHsnbWFya2VyLWVuZCc6ICd1cmwoI3RyaWFuZ2xlKSd9KVxuXHRcdFxuXHRcdHRleHQob2Zmc2V0WCwgMzEwLCAnMCcsICd3aGl0ZScpXG5cdFx0dGV4dChvZmZzZXRYLCAzNDAsICdZQVcgUkFURScsICd3aGl0ZScpXG5cdFx0XG5cdFx0Ly8gLS0tLSBDcmVhdGUgUm9sbCBSYXRlIFNjYWxlIGFuZCBQb2ludGVyIC0tLS1cblx0XHRcblx0XHR3aWRndE0uUm9sbFJhdGVNYXJrZXIgPSBsaW5lKDAsIDM2LCAwLCAzNywgJ2JsYWNrJywgeydtYXJrZXItZW5kJzogJ3VybCgjdHJpYW5nbGUpJ30pXG5cdFx0XG5cdFx0dGV4dChvZmZzZXRYLCA1MSsxMSwgJzAnLCAnd2hpdGUnKVxuXHRcdHRleHQob2Zmc2V0WCwgMzAsICdST0xMIFJBVEUnLCAnd2hpdGUnKVxuXHRcdFxuXHRcdGZvciAobGV0IGkgPSAtNTsgaSA8PSA1OyBpKyspIHtcblx0XHRcdGxpbmUob2Zmc2V0WCArIDEwICogaSwgNDUsIG9mZnNldFggKyAxMCAqIGksIDUwLCAnd2hpdGUnKVxuXHRcdH1cblx0XHRcdFx0XG5cdFx0Ly8gLS0tLSBDcmVhdGUgUGl0Y2ggUmF0ZSBTY2FsZSBhbmQgUG9pbnRlciAtLS0tXG5cdFx0Zm9yIChsZXQgaSA9IC01OyBpIDw9IDU7IGkrKykge1xuXHRcdFx0bGluZSgyODAsIG9mZnNldFkgKyAxMCAqIGksIDI4NSwgb2Zmc2V0WSArIDEwICogaSwgJ3doaXRlJylcblx0XHR9XG5cdFx0XG5cdFx0d2lkZ3RNLlBpdGNoUmF0ZU1hcmtlciA9IGxpbmUoMjk2LCAwLCAyOTUsIDAsICdibGFjaycsIHsnbWFya2VyLWVuZCc6ICd1cmwoI3RyaWFuZ2xlKSd9KVxuXHRcdFxuXHRcdHRleHQob2Zmc2V0WCArIDEyOC01LCBvZmZzZXRZLCAnMCcsICd3aGl0ZScsIHsnYWxpZ25tZW50LWJhc2VsaW5lJzogJ21pZGRsZSd9KVxuXHRcdFxuXHRcdHRleHQob2Zmc2V0WCArIDE1NSwgb2Zmc2V0WSAtIDMwLCAnUCcsICd3aGl0ZScpXG5cdFx0dGV4dChvZmZzZXRYICsgMTU1LCBvZmZzZXRZIC0gMjIsICdJJywgJ3doaXRlJylcblx0XHR0ZXh0KG9mZnNldFggKyAxNTUsIG9mZnNldFkgLSAxNCwgJ1QnLCAnd2hpdGUnKVxuXHRcdHRleHQob2Zmc2V0WCArIDE1NSwgb2Zmc2V0WSAtICA2LCAnQycsICd3aGl0ZScpXG5cdFx0dGV4dChvZmZzZXRYICsgMTU1LCBvZmZzZXRZICsgIDIsICdIJywgJ3doaXRlJylcblx0XHRcblx0XHR0ZXh0KG9mZnNldFggKyAxNTUsIG9mZnNldFkgKyAxOCwgJ1InLCAnd2hpdGUnKVxuXHRcdHRleHQob2Zmc2V0WCArIDE1NSwgb2Zmc2V0WSArIDI2LCAnQScsICd3aGl0ZScpXG5cdFx0dGV4dChvZmZzZXRYICsgMTU1LCBvZmZzZXRZICsgMzQsICdUJywgJ3doaXRlJylcblx0XHR0ZXh0KG9mZnNldFggKyAxNTUsIG9mZnNldFkgKyA0MiwgJ0UnLCAnd2hpdGUnKVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7bnVtYmVyfSBhIFxuXHRcdCAqIEByZXR1cm5zIHtudW1iZXJ9XG5cdFx0ICovXHRcdFx0XHRcdFxuXHRcdGZ1bmN0aW9uIGFkanVzdChhKSB7XG5cdFx0XHRjb25zdCBQSTIgPSAyICogTWF0aC5QSVxuXHRcdFx0XG5cdFx0XHRpZiAoYSA8IC1QSTIpIFxuXHRcdFx0XHRyZXR1cm4gIGEgKyBQSTJcblx0XHRcdGlmIChhID49IFBJMilcblx0XHRcdFx0cmV0dXJuIGEgLSBQSTJcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGFcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBtaW5NYXgodiwgbWluLCBtYXgpIHtcblx0XHRcdHJldHVybiBNYXRoLm1heChNYXRoLm1pbihtYXgsIHYpLCBtaW4pXG5cdFx0fVxuXHRcdFxuXHRcdGZ1bmN0aW9uIG1vdmVfZmRhaV9tYXJrZXIoaW11X2FuZ2xlLCBlcnJvciwgb21lZ2EpIHtcblxuXHRcdFx0Ly9jb25zb2xlLmxvZygnbW92ZV9mZGFpX21hcmtlcicsIHtpbXVfYW5nbGUsIGVycm9yLCBvbWVnYX0pXG5cdFx0XHRjb25zdCBbT21lZ2FfWWF3LCBPbWVnYV9QaXRjaCwgT21lZ2FfUm9sbF0gPSBvbWVnYVxuXHRcdFx0Y29uc3QgT0dBID0gaW11X2FuZ2xlWzBdICogREVHX1RPX1JBRFxuXHRcdFx0Y29uc3QgSUdBID0gaW11X2FuZ2xlWzFdICogREVHX1RPX1JBRFxuXHRcdFx0Y29uc3QgTUdBID0gaW11X2FuZ2xlWzJdICogREVHX1RPX1JBRFxuXG5cdFx0XHRjb25zdCBbZXJyb3JfeCwgZXJyb3JfeSwgZXJyb3Jfel0gPSBlcnJvclxuXHRcdFx0XHRcblx0XHRcdGNvbnN0IHNpbk9HID0gTWF0aC5zaW4oT0dBKVxuXHRcdFx0Y29uc3Qgc2luSUcgPSBNYXRoLnNpbihJR0EpXG5cdFx0XHRjb25zdCBzaW5NRyA9IE1hdGguc2luKE1HQSlcblx0XHRcblx0XHRcdGNvbnN0IGNvc09HID0gTWF0aC5jb3MoT0dBKVxuXHRcdFx0Y29uc3QgY29zSUcgPSBNYXRoLmNvcyhJR0EpXG5cdFx0XHRjb25zdCBjb3NNRyA9IE1hdGguY29zKE1HQSlcblx0XHRcblx0XHRcdC8vIC0tLS0gRXh0cmFjdCBBdHRpdHVkZSBFdWxlciBhbmdsZXMgb3V0IG9mIHRoZSByb3RhdGlvbiBtYXRyaXggU3RhYmxlIE1lbWJlciBpbnRvIE5hdmlnYXRpb24gQmFzZSAtLS0tXG5cdFx0XHRjb25zdCB0MTIgPSBzaW5NR1xuXHRcdFx0Y29uc3QgdDIyID0gY29zTUcgKiBjb3NPRyAgICBcblx0XHRcdGNvbnN0IHQzMSA9IGNvc0lHICogc2luTUcgKiBzaW5PRyArIHNpbklHICogY29zT0dcblx0XHRcdGNvbnN0IHQzMiA9IC1jb3NNRyAqIHNpbk9HXG5cdFx0XHRjb25zdCB0MzMgPSAtc2luSUcgKiBzaW5NRyAqIHNpbk9HICsgY29zSUcgKiBjb3NPR1xuXHRcdFxuXHRcdFx0Y29uc3QgUk9MTCAgPSBhZGp1c3QoTWF0aC5hdGFuMih0MTIsIHQyMikpXG5cdFx0XHRjb25zdCBQSVRDSCA9IGFkanVzdChNYXRoLmF0YW4yKHQzMSwgdDMzKSlcblx0XHRcdGNvbnN0IFlBVyAgID0gYWRqdXN0KE1hdGguYXNpbih0MzIpKVxuXHRcdFx0Ly9jb25zb2xlLmxvZyh7Uk9MTCwgUElUQ0gsIFlBV30pXG5cdFx0XG5cdFx0XHQvLyAtLS0tIENhbGN1bGF0ZSBGREFJIEFuZ2xlcyAtLS0tXG5cdFx0XHRjb25zdCBGREFJWl9SQUQgPSBST0xMXG5cdFx0XHRjb25zdCBTSU5fWiAgICAgPSBNYXRoLnNpbigtMSAqIEZEQUlaX1JBRClcblx0XHRcdGNvbnN0IENPU19aICAgICA9IE1hdGguY29zKC0xICogRkRBSVpfUkFEKVxuXHRcdFxuXHRcdFx0Y29uc3QgRkRBSVhfQU5HTEUgPSAtMSAqIFlBVyAqIFJBRF9UT19ERUdcblx0XHRcdGNvbnN0IEZEQUlZX0FOR0xFID0gUElUQ0ggKiBSQURfVE9fREVHXG5cdFx0XHRjb25zdCBGREFJWl9BTkdMRSA9IFJPTEwgKiBSQURfVE9fREVHXHRcdFx0XG5cdFx0XG5cdFx0XHRjb25zdCBmZGFpeCA9IChGREFJWF9BTkdMRSA+IDApID8gLUZEQUlYX0FOR0xFICsgMzYwIDogTWF0aC5hYnMoRkRBSVhfQU5HTEUpXG5cdFx0XHRjb25zdCBmZGFpeSA9IChGREFJWV9BTkdMRSA8IDApID8gRkRBSVlfQU5HTEUgKyAzNjAgOiBGREFJWV9BTkdMRVxuXHRcdFx0Y29uc3QgZmRhaXogPSAoRkRBSVpfQU5HTEUgPCAwKSA/IEZEQUlaX0FOR0xFICsgMzYwIDogRkRBSVpfQU5HTEVcblx0XHRcdGVsdC50cmlnZ2VyKCdkYXRhJywge2V1bGVyOiBbZmRhaXgsIGZkYWl5LCBmZGFpel19KVxuXHRcdFx0XG5cdFx0XHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tIE1vdmUgWWF3IFJhdGUgTWFya2VyIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cdFx0XHQgXHRcblx0XHRcdHNldFgoJ1lhd1JhdGVNYXJrZXInLCBvZmZzZXRYIC0gMTAgKiBtaW5NYXgoT21lZ2FfWWF3LCAtNSwgNSkpXG5cdFx0XG5cdFx0XHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tIE1vdmUgUGl0Y2ggUmF0ZSBNYXJrZXIgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVx0XHRcblx0XHRcdHNldFkoJ1BpdGNoUmF0ZU1hcmtlcicsIG9mZnNldFkgLSAxMCAqIG1pbk1heChPbWVnYV9QaXRjaCwgLTUsIDUpKVxuXHRcdFxuXHRcdFx0Ly8gLS0tLS0tLS0tLS0tLS0tLS0tLSBNb3ZlIFJvbGwgUmF0ZSBNYXJrZXIgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHRcdFx0c2V0WCgnUm9sbFJhdGVNYXJrZXInLCBvZmZzZXRYICsgMTAgKiBtaW5NYXgoT21lZ2FfUm9sbCwgLTUsIDUpKVxuXHRcdFxuXHRcdFx0Ly8gLS0tLS0tLS0tLS0tLS0tLS0tLSBNb3ZlIFlhdyBFcnJvciBOZWVkbGUgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdFx0XHRzZXRYKCdZYXdFcnJvck5lZWRsZScsIG9mZnNldFggKyBlcnJvcl94ICogTkVFRExFX1NDQUxFKVxuXHRcdFxuXHRcdFx0Ly8gLS0tLS0tLS0tLS0tLS0tLS0tLSBNb3ZlIFBpdGNoIEVycm9yIE5lZWRsZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0XHRcdHNldFkoJ1BpdGNoRXJyb3JOZWVkbGUnLCBvZmZzZXRZICsgZXJyb3JfeSAqIE5FRURMRV9TQ0FMRSlcblx0XHRcblx0XHRcdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0gTW92ZSBSb2xsIEVycm9yIE5lZWRsZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0XHRcdHNldFgoJ1JvbGxFcnJvck5lZWRsZScsIG9mZnNldFggLSBlcnJvcl96ICogTkVFRExFX1NDQUxFKVxuXHRcdFxuXHRcdFx0Ly8gLS0tLS0tLS0tLS0tLS0tLS0tLSBSb3RhdGUgUm9sbCBNYXJrZXIgKExNLVotQXhpcykgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdFx0XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdGREFJWl9SQUQnLCBGREFJWl9SQUQpXG5cdFx0XHRjb25zdCByID0gODVcblx0XHRcdGNvbnN0IHgxID0gb2Zmc2V0WCArIHIgKiBNYXRoLnNpbihGREFJWl9SQUQgKyBNYXRoLlBJKVxuXHRcdFx0Y29uc3QgeDIgPSBvZmZzZXRYICsgKHIrMSkgKiBNYXRoLnNpbihGREFJWl9SQUQgKyBNYXRoLlBJKVxuXHRcdFx0Y29uc3QgeTEgPSBvZmZzZXRZICsgciAqIE1hdGguY29zKEZEQUlaX1JBRCArIE1hdGguUEkpXG5cdFx0XHRjb25zdCB5MiA9IG9mZnNldFkgKyAocisxKSAqIE1hdGguY29zKEZEQUlaX1JBRCArIE1hdGguUEkpXG5cdFx0XG5cdFx0XHRzZXRMaW5lKCdSb2xsTWFya2VyJywgeDEsIHkxLCB4MiwgeTIpXG5cdFx0XG5cdFx0XG5cdFx0XHQvKipcblx0XHRcdCAqIFxuXHRcdFx0ICogQHBhcmFtIHtudW1iZXJ9IHggXG5cdFx0XHQgKiBAcGFyYW0ge251bWJlcn0geSBcblx0XHRcdCAqIEByZXR1cm5zIHt7eDogbnVtYmVyLCB5OiBudW1iZXJ9fVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBNYXRyaXhQcm9kdWN0KHgsIHkpIHtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHR4OiAoeCAqIENPU19aIC0geSAqIFNJTl9aKSArIG9mZnNldFgsXG5cdFx0XHRcdFx0eTogKHggKiBTSU5fWiArIHkgKiBDT1NfWikgKyBvZmZzZXRZXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcblx0XHRcdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0gTW92ZSBQaXRjaCBTY2FsZSAoTE0tWS1BeGlzKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0XHRcblx0XHRcdGNvbnN0IHRtcFlBbmdsZSA9IChGREFJWV9BTkdMRSA+IDE4MCkgPyBGREFJWV9BTkdMRSAtIDE4MCA6IEZEQUlZX0FOR0xFXG5cdFx0XHRmb3IobGV0IGkgPSAtMjcwOyBpIDw9IDI3MDsgaSArPSAzMCkge1xuXHRcdFx0XHRjb25zdCB4cDEgPSAtNTBcblx0XHRcdFx0Y29uc3QgeHAyID0gNTBcblx0XHRcdFx0Y29uc3QgeXAxID0gLWkgKyB0bXBZQW5nbGVcblx0XHRcdFx0Y29uc3QgeHB0ID0gMFxuXHRcdFx0XHRjb25zdCB5cHQgPSB5cDFcblx0XHRcblx0XHRcdFx0Ly8gUm90YXRlIFBpdGNoIFNjYWxlIGFsb25nIHRoZSBMTS1aLUF4aXNcblx0XHRcdFx0Y29uc3Qge3g6IHhwdF9yLCB5OiB5cHRfcn0gPSBNYXRyaXhQcm9kdWN0KHhwdCwgeXB0KVxuXHRcdFx0XHRjb25zdCB7eDogeHAxX3IsIHk6IHlwMV9yfSA9IE1hdHJpeFByb2R1Y3QoeHAxLCB5cDEpXG5cdFx0XHRcdGNvbnN0IHt4OiB4cDJfciwgeTogeXAyX3J9ID0gTWF0cml4UHJvZHVjdCh4cDIsIHlwMSlcblx0XHRcblx0XHRcdFx0Ly8gRHJhdyBQaXRjaCBNYXJrc1xuXHRcdFx0XHRzZXRQb3MoYFBJVENIX1RYVF8ke2l9YCwgeHB0X3IsIHlwdF9yKVxuXHRcdFx0XHRzZXRMaW5lKGBQSVRDSF8ke2l9YCwgeHAxX3IsIHlwMV9yLCB4cDJfciwgeXAyX3IpXG5cdFx0XHR9XG5cdFx0XG5cdFx0XHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLSBNb3ZlIFlBVy1BeGlzIChMTS1YLUF4aXMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHRcdFxuXHRcdFx0Y29uc3QgdGVtcFhBbmdsZSA9IChGREFJWF9BTkdMRSA+IDE4MCkgPyBGREFJWF9BTkdMRSAtIDM2MCA6IEZEQUlYX0FOR0xFXG5cdFx0XHRjb25zdCB4cExNMSA9IC0yODAgKyB0ZW1wWEFuZ2xlXG5cdFx0XHRjb25zdCB5cExNMSA9IDBcblx0XHRcdGNvbnN0IHhwTE0yID0gMjgwICsgdGVtcFhBbmdsZVxuXHRcdFx0Y29uc3QgeXBMTTIgPSAwXG5cdFx0XG5cdFx0XHRjb25zdCB7eDogeHBMTTFfciwgeTogeXBMTTFfcn0gPSBNYXRyaXhQcm9kdWN0KHhwTE0xLCB5cExNMSlcblx0XHRcdGNvbnN0IHt4OiB4cExNMl9yLCB5OiB5cExNMl9yfSA9IE1hdHJpeFByb2R1Y3QoeHBMTTIsIHlwTE0yKVxuXHRcdFxuXHRcdFx0c2V0TGluZSgnekF4aXNMTScsIHhwTE0xX3IsIHlwTE0xX3IsIHhwTE0yX3IsIHlwTE0yX3IpXG5cdFx0XG5cdFx0XHRmb3IobGV0IGkgPSAtMjcwOyBpIDw9IDI3MDsgaSArPSAzMCkge1xuXHRcdFx0XHRjb25zdCB4cDEgPSBpICsgdGVtcFhBbmdsZVxuXHRcdFx0XHRjb25zdCB5cDEgPSAtMlxuXHRcdFx0XHRjb25zdCB4cDIgPSBpICsgdGVtcFhBbmdsZVxuXHRcdFx0XHRjb25zdCB5cDIgPSAzXG5cdFx0XHRcdGNvbnN0IHhwdCA9IGkgKyB0ZW1wWEFuZ2xlXG5cdFx0XHRcdGNvbnN0IHlwdCA9IDEwXG5cdFx0XG5cdFx0XHRcdC8vIFJvdGF0ZSBQaXRjaCBTY2FsZSBhbG9uZyB0aGUgTE0tWi1BeGlzXG5cdFx0XHRcdGNvbnN0IHt4OiB4cHRfciwgeTogeXB0X3J9ID0gTWF0cml4UHJvZHVjdCh4cHQsIHlwdClcblx0XHRcdFx0Y29uc3Qge3g6IHhwMV9yLCB5OiB5cDFfcn0gPSBNYXRyaXhQcm9kdWN0KHhwMSwgeXAxKVxuXHRcdFx0XHRjb25zdCB7eDogeHAyX3IsIHk6IHlwMl9yfSA9IE1hdHJpeFByb2R1Y3QoeHAyLCB5cDIpXG5cdFx0XG5cdFx0XHRcdC8vIERyYXcgUGl0Y2ggTWFya3Ncblx0XHRcdFx0c2V0UG9zKGB6QXhpc19UWFRfJHtpfWAsIHhwdF9yLCB5cHRfcilcblx0XHRcdFx0c2V0TGluZShgekF4aXNfJHtpfWAsIHhwMV9yLCB5cDFfciwgeHAyX3IsIHlwMl9yKVxuXHRcdFx0fVxuXHRcdFxuXHRcdH1cblx0XHRcblx0XHRtb3ZlX2ZkYWlfbWFya2VyKFswLCAwLCAwXSwgWzAsIDAsIDBdLCBbMCwgMCwgMF0pXHRcblx0XHRcblx0XHR0aGlzLnVwZGF0ZSA9IG1vdmVfZmRhaV9tYXJrZXJcblxuXG5cdH1cblxuXG5cdFxuXG59KTtcblxuXG5cblxuIiwiLy8gQHRzLWNoZWNrXG5cbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdJTlBVVCcsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLWV2ZW50PVxcXCJjbGljay5jaGVjazogb25DaGVja2JveFxcXCI+XFxuICAgIDxkaXY+XFxuICAgICAgICA8ZmllbGRzZXQ+XFxuICAgICAgICAgICAgPGxlZ2VuZD5FTkdJTkU8L2xlZ2VuZD5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkYXRhXFxcIj5cXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBibi1kYXRhPVxcXCJ7Y2hhbm5lbDogMzAsIGJpdDogM31cXFwiIGNsYXNzPVxcXCJjaGVja1xcXCIgY2hlY2tlZD5cXG4gICAgICAgICAgICAgICAgPGxhYmVsPkVOR0lORSBBUk1FUyBTSUdOQUw8L2xhYmVsPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImRhdGFcXFwiPlxcbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGJuLWRhdGE9XFxcIntjaGFubmVsOiAzMCwgYml0OiA1fVxcXCIgY2xhc3M9XFxcImNoZWNrXFxcIj5cXG4gICAgICAgICAgICAgICAgPGxhYmVsPkFVVE8gVEhST1RUTEU8YnI+Q09NUFVURVIgQ09OVFJPTCBPRiBERVNDRU5UPC9sYWJlbD5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkYXRhXFxcIj5cXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBibi1kYXRhPVxcXCJ7Y2hhbm5lbDogMzIsIGJpdDogOX1cXFwiIGNsYXNzPVxcXCJjaGVja1xcXCI+XFxuICAgICAgICAgICAgICAgIDxsYWJlbD5ERVNDRU5UIEVOR0lORTxicj5ESVNBQkxFRCBCWSBDUkVXPC9sYWJlbD5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkYXRhXFxcIj5cXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBibi1kYXRhPVxcXCJ7Y2hhbm5lbDogMzIsIGJpdDogMTB9XFxcIiBjbGFzcz1cXFwiY2hlY2tcXFwiPlxcbiAgICAgICAgICAgICAgICA8bGFiZWw+QVBQQVJFTlQgREVTQ0VOVCBFTkdJTkU8YnI+R0lNQkFMIEZBSUxVUkU8L2xhYmVsPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9maWVsZHNldD5cXG4gICAgICAgIDxmaWVsZHNldD5cXG4gICAgICAgICAgICA8bGVnZW5kPlRIUlVTVEVSUzwvbGVnZW5kPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImRhdGFcXFwiPlxcbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGJuLWRhdGE9XFxcIntjaGFubmVsOiAzMiwgYml0OiAxfVxcXCIgY2xhc3M9XFxcImNoZWNrXFxcIj5cXG4gICAgICAgICAgICAgICAgPGxhYmVsPlRIUlVTVEVSUyAyJjQgRElTQUJMRUQ8L2xhYmVsPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImRhdGFcXFwiPlxcbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGJuLWRhdGE9XFxcIntjaGFubmVsOiAzMiwgYml0OiAyfVxcXCIgY2xhc3M9XFxcImNoZWNrXFxcIj5cXG4gICAgICAgICAgICAgICAgPGxhYmVsPlRIUlVTVEVSUyA1JjggRElTQUJMRUQ8L2xhYmVsPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImRhdGFcXFwiPlxcbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGJuLWRhdGE9XFxcIntjaGFubmVsOiAzMiwgYml0OiAzfVxcXCIgY2xhc3M9XFxcImNoZWNrXFxcIj5cXG4gICAgICAgICAgICAgICAgPGxhYmVsPlRIUlVTVEVSUyAxJjMgRElTQUJMRUQ8L2xhYmVsPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImRhdGFcXFwiPlxcbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGJuLWRhdGE9XFxcIntjaGFubmVsOiAzMiwgYml0OiA0fVxcXCIgY2xhc3M9XFxcImNoZWNrXFxcIj5cXG4gICAgICAgICAgICAgICAgPGxhYmVsPlRIUlVTVEVSUyA2JjcgRElTQUJMRUQ8L2xhYmVsPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImRhdGFcXFwiPlxcbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGJuLWRhdGE9XFxcIntjaGFubmVsOiAzMiwgYml0OiA1fVxcXCIgY2xhc3M9XFxcImNoZWNrXFxcIj5cXG4gICAgICAgICAgICAgICAgPGxhYmVsPlRIUlVTVEVSUyAxNCYxNiBESVNBQkxFRDwvbGFiZWw+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZGF0YVxcXCI+XFxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgYm4tZGF0YT1cXFwie2NoYW5uZWw6IDMyLCBiaXQ6IDZ9XFxcIiBjbGFzcz1cXFwiY2hlY2tcXFwiPlxcbiAgICAgICAgICAgICAgICA8bGFiZWw+VEhSVVNURVJTIDEzJjE1IERJU0FCTEVEPC9sYWJlbD5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkYXRhXFxcIj5cXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBibi1kYXRhPVxcXCJ7Y2hhbm5lbDogMzIsIGJpdDogN31cXFwiIGNsYXNzPVxcXCJjaGVja1xcXCI+XFxuICAgICAgICAgICAgICAgIDxsYWJlbD5USFJVU1RFUlMgOSYxMiBESVNBQkxFRDwvbGFiZWw+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZGF0YVxcXCI+XFxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgYm4tZGF0YT1cXFwie2NoYW5uZWw6IDMyLCBiaXQ6IDh9XFxcIiBjbGFzcz1cXFwiY2hlY2tcXFwiPlxcbiAgICAgICAgICAgICAgICA8bGFiZWw+VEhSVVNURVJTIDEwJjExIERJU0FCTEVEPC9sYWJlbD5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZmllbGRzZXQ+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2PlxcbiAgICAgICAgPGZpZWxkc2V0PlxcbiAgICAgICAgICAgIDxsZWdlbmQ+UkFEQVI8L2xlZ2VuZD5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkYXRhXFxcIj5cXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBibi1kYXRhPVxcXCJ7Y2hhbm5lbDogMzMsIGJpdDogMn1cXFwiIGNsYXNzPVxcXCJjaGVja1xcXCI+XFxuICAgICAgICAgICAgICAgIDxsYWJlbD5SUiBBVVRPLVBPV0VSIE9OPC9sYWJlbD5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZmllbGRzZXQ+XFxuICAgICAgICA8ZmllbGRzZXQ+XFxuICAgICAgICAgICAgPGxlZ2VuZD5JTVU8L2xlZ2VuZD5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkYXRhXFxcIj5cXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBibi1kYXRhPVxcXCJ7Y2hhbm5lbDogMzAsIGJpdDogMTR9XFxcIiBjbGFzcz1cXFwiY2hlY2tcXFwiPlxcbiAgICAgICAgICAgICAgICA8bGFiZWw+SVNTIFRVUk4gT04gUkVRVUVTVEVEPC9sYWJlbD5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkYXRhXFxcIj5cXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBibi1kYXRhPVxcXCJ7Y2hhbm5lbDogMzAsIGJpdDogMTF9XFxcIiBjbGFzcz1cXFwiY2hlY2tcXFwiPlxcbiAgICAgICAgICAgICAgICA8bGFiZWw+SU1VIENBR0UgQ09NTUFORCBUTyBEUklWRTxicj5JTVUgR0lNQkFMIEFOR0xFUyBUTyAwPC9sYWJlbD5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkYXRhXFxcIj5cXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBibi1kYXRhPVxcXCJ7Y2hhbm5lbDogMzAsIGJpdDogNn1cXFwiIGNsYXNzPVxcXCJjaGVja1xcXCIgY2hlY2tlZD5cXG4gICAgICAgICAgICAgICAgPGxhYmVsPkRJU1BMQVkgSU5FUlRJQUwgREFUQTwvbGFiZWw+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2ZpZWxkc2V0PlxcbiAgICAgICAgPGZpZWxkc2V0PlxcbiAgICAgICAgICAgIDxsZWdlbmQ+REFQL0FUVElUVURFIE1PREU8L2xlZ2VuZD5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkYXRhXFxcIj5cXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBibi1kYXRhPVxcXCJ7Y2hhbm5lbDogMzAsIGJpdDogMTB9XFxcIiBjbGFzcz1cXFwiY2hlY2tcXFwiIGNoZWNrZWQ+XFxuICAgICAgICAgICAgICAgIDxsYWJlbD5BR0MgSEFTIENPTlRST0wgT0YgTE08YnI+KE5PVCBBR1MpPC9sYWJlbD5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMucmFkaW9ncm91cFxcXCIgYm4tZXZlbnQ9XFxcImNoYW5nZTogb25EYXBNb2RlQ2hhbmdlXFxcIiBibi12YWw9XFxcIkRBUF9NT0RFXFxcIj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZGF0YVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwicmFkaW9cXFwiIHZhbHVlPVxcXCJPRkZcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPkRBUCBPRkY8L2xhYmVsPlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZGF0YVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwicmFkaW9cXFwiIHZhbHVlPVxcXCJIT0xEXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD5BVFRJVFVERSBIT0xEIE1PREUgT048L2xhYmVsPlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZGF0YVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwicmFkaW9cXFwiIHZhbHVlPVxcXCJBVVRPXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD5BVVRPIFNUQUJJTElaQVRJT048YnI+T0YgQVRUSVRVREUgT048L2xhYmVsPlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZmllbGRzZXQ+XFxuXFxuICAgICAgICA8ZmllbGRzZXQ+XFxuICAgICAgICAgICAgPGxlZ2VuZD5BT1QgQlVUVE9OUzwvbGVnZW5kPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImRhdGFcXFwiPlxcbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGJuLWRhdGE9XFxcIntjaGFubmVsOiAxNiwgYml0OiAzfVxcXCIgY2xhc3M9XFxcImNoZWNrXFxcIj5cXG4gICAgICAgICAgICAgICAgPGxhYmVsPlgtQVhJUyBNQVJLPC9sYWJlbD5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkYXRhXFxcIj5cXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBibi1kYXRhPVxcXCJ7Y2hhbm5lbDogMTYsIGJpdDogNH1cXFwiIGNsYXNzPVxcXCJjaGVja1xcXCI+XFxuICAgICAgICAgICAgICAgIDxsYWJlbD5ZLUFYSVMgTUFSSzwvbGFiZWw+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZGF0YVxcXCI+XFxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgYm4tZGF0YT1cXFwie2NoYW5uZWw6IDE2LCBiaXQ6IDV9XFxcIiBjbGFzcz1cXFwiY2hlY2tcXFwiPlxcbiAgICAgICAgICAgICAgICA8bGFiZWw+TUFSSyBSRUpFQ1Q8L2xhYmVsPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9maWVsZHNldD5cXG5cXG4gICAgICAgIDxmaWVsZHNldD5cXG4gICAgICAgICAgICA8bGVnZW5kPkRFU0NFTlQgQ09OVFJPTDwvbGVnZW5kPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImRhdGFcXFwiPlxcbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGJuLWRhdGE9XFxcIntjaGFubmVsOiAxNiwgYml0OiA2fVxcXCIgY2xhc3M9XFxcImNoZWNrXFxcIj5cXG4gICAgICAgICAgICAgICAgPGxhYmVsPkRFU0NFTlQrPC9sYWJlbD5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkYXRhXFxcIj5cXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBibi1kYXRhPVxcXCJ7Y2hhbm5lbDogMTYsIGJpdDogN31cXFwiIGNsYXNzPVxcXCJjaGVja1xcXCI+XFxuICAgICAgICAgICAgICAgIDxsYWJlbD5ERVNDRU5ULTwvbGFiZWw+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2ZpZWxkc2V0PlxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdj5cXG4gICAgICAgIDxmaWVsZHNldD5cXG4gICAgICAgICAgICA8bGVnZW5kPlJIQy9BQ0E8L2xlZ2VuZD5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzbGlkZXJcXFwiPlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzbGlkZXJWYWx1ZVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+Um9sbDwvbGFiZWw+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBibi10ZXh0PVxcXCJyb2xsXFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuc2xpZGVyXFxcIiBibi1kYXRhPVxcXCJyaGNSYW5nZVxcXCIgYm4tdXBkYXRlPVxcXCJpbnB1dFxcXCIgYm4tdmFsPVxcXCJyb2xsXFxcIiBibi1ldmVudD1cXFwiaW5wdXQ6IG9uUm9sbENoYW5nZVxcXCI+PC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwic2xpZGVyXFxcIj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwic2xpZGVyVmFsdWVcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPlBpdGNoPC9sYWJlbD5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGJuLXRleHQ9XFxcInBpdGNoXFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuc2xpZGVyXFxcIiBibi1kYXRhPVxcXCJyaGNSYW5nZVxcXCIgYm4tdXBkYXRlPVxcXCJpbnB1dFxcXCIgYm4tdmFsPVxcXCJwaXRjaFxcXCIgYm4tZXZlbnQ9XFxcImlucHV0OiBvblBpdGNoQ2hhbmdlXFxcIj48L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzbGlkZXJcXFwiPlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzbGlkZXJWYWx1ZVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+WWF3PC9sYWJlbD5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGJuLXRleHQ9XFxcInlhd1xcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLnNsaWRlclxcXCIgYm4tZGF0YT1cXFwicmhjUmFuZ2VcXFwiIGJuLXVwZGF0ZT1cXFwiaW5wdXRcXFwiIGJuLXZhbD1cXFwieWF3XFxcIiBibi1ldmVudD1cXFwiaW5wdXQ6IG9uWWF3Q2hhbmdlXFxcIj48L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2PlxcbiAgICAgICAgICAgICAgICA8YnV0dG9uIGJuLWV2ZW50PVxcXCJjbGljazogb25EZXRlbnRcXFwiPkRFVEVOVDwvYnV0dG9uPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9maWVsZHNldD5cXG5cXG4gICAgICAgIDxmaWVsZHNldD5cXG4gICAgICAgICAgICA8bGVnZW5kPlRIQzwvbGVnZW5kPlxcbiAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5yYWRpb2dyb3VwXFxcIiBjbGFzcz1cXFwiVEhDXFxcIiBibi1ldmVudD1cXFwiY2hhbmdlOiBvblRoY0NoYW5nZVxcXCIgYm4tdmFsPVxcXCJUSENcXFwiPlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkYXRhXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJyYWRpb1xcXCIgdmFsdWU9XFxcIk5FVVRSQUxcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPk5FVVRSQUw8L2xhYmVsPlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiWFlaXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXY+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZGF0YVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJyYWRpb1xcXCIgdmFsdWU9XFxcIitYXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPitYPC9sYWJlbD5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkYXRhXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcInJhZGlvXFxcIiB2YWx1ZT1cXFwiK1lcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+K1k8L2xhYmVsPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImRhdGFcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwicmFkaW9cXFwiIHZhbHVlPVxcXCIrWlxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4rWjwvbGFiZWw+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXY+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZGF0YVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJyYWRpb1xcXCIgdmFsdWU9XFxcIi1YXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPi1YPC9sYWJlbD5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkYXRhXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcInJhZGlvXFxcIiB2YWx1ZT1cXFwiLVlcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+LVk8L2xhYmVsPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImRhdGFcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwicmFkaW9cXFwiIHZhbHVlPVxcXCItWlxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4tWjwvbGFiZWw+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2ZpZWxkc2V0PlxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmdhbWVwYWQnLCAnYXBwLmVtdUFnYyddLFxuXG5cdHByb3BzOiB7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkdhbWVwYWQuSW50ZXJmYWNlfSBnYW1lcGFkXG5cdCAqIEBwYXJhbSB7QXBwQWdjLlNlcnZpY2VzLkFHQy5JbnRlcmZhY2V9IGFnY1xuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgZ2FtZXBhZCwgYWdjKSB7XG5cblxuXHRcdGdhbWVwYWQub24oJ2Nvbm5lY3RlZCcsIChldikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2Nvbm5lY3RlZCcsIGV2KVxuXHRcdFx0Y2hlY2tHYW1lUGFkU3RhdHVzKClcblx0XHR9KVxuXG5cdFx0ZnVuY3Rpb24gY2hlY2tHYW1lUGFkU3RhdHVzKCkge1xuXHRcdFx0Y29uc3QgaW5mbyA9IGdhbWVwYWQuZ2V0R2FtZXBhZHMoKVswXVxuXHRcdFx0aWYgKGluZm8pIHtcblx0XHRcdFx0Y29uc3Qge2F4ZXN9ID0gaW5mb1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdheGVzJywgYXhlcylcblx0XHRcdFx0Y29uc3Qgcm9sbCA9IE1hdGguY2VpbChheGVzWzBdICogNTcpXG5cdFx0XHRcdGNvbnN0IHBpdGNoID0gTWF0aC5jZWlsKGF4ZXNbMV0gKiA1Nylcblx0XHRcdFx0Y3RybC5zZXREYXRhKHtyb2xsLCBwaXRjaH0pXG5cdFx0XHRcdHNldFRpbWVvdXQoY2hlY2tHYW1lUGFkU3RhdHVzLCA1MClcblx0XHRcdH1cblx0XHR9XG5cblx0XHRcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0cm9sbDogMCxcblx0XHRcdFx0cGl0Y2g6IDAsXG5cdFx0XHRcdHlhdzogMCxcblx0XHRcdFx0cmhjUmFuZ2U6IHtcblx0XHRcdFx0XHRtaW46IC01Nyxcblx0XHRcdFx0XHRtYXg6IDU3XG5cdFx0XHRcdH0sXG5cdFx0XHRcdERBUF9NT0RFOiAnT0ZGJyxcblx0XHRcdFx0VEhDOiAnTkVVVFJBTCdcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25EZXRlbnQ6IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uRGV0ZW50Jylcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyByb2xsOiAwLCBwaXRjaDogMCwgeWF3OiAwIH0pXG5cdFx0XHRcdFx0YWdjLndyaXRlSW8oMG8xNjYsIDApXG5cdFx0XHRcdFx0YWdjLndyaXRlSW8oMG8xNjcsIDApXG5cdFx0XHRcdFx0YWdjLndyaXRlSW8oMG8xNzAsIDApXG5cdFx0XHRcdFx0YWdjLndyaXRlSW9CaXQoMG8zMSwgMTUsIDEpXG5cdFx0XHRcdFx0cmVzZXRfcmhjKClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25DaGVja2JveDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IGNoZWNrID0gJCh0aGlzKVxuXHRcdFx0XHRcdGNvbnN0IHsgY2hhbm5lbCwgYml0IH0gPSBjaGVjay5kYXRhKClcblx0XHRcdFx0XHRjb25zdCBjaGFuT2N0YWwgPSBwYXJzZUludChjaGFubmVsLCA4KVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uQ2hlY2tib3gnLCBjaGVjay5kYXRhKCksIGNoZWNrLmdldFZhbHVlKCkpXG5cdFx0XHRcdFx0YWdjLndyaXRlSW9CaXQoY2hhbk9jdGFsLCBiaXQsIGNoZWNrLmdldFZhbHVlKCkgPyAwIDogMSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25EYXBNb2RlQ2hhbmdlOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRjb25zdCBEQVBfTU9ERSA9ICQodGhpcykuZ2V0VmFsdWUoKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkRhcE1vZGVDaGFuZ2UnLCBEQVBfTU9ERSlcblx0XHRcdFx0XHRzd2l0Y2ggKERBUF9NT0RFKSB7XG5cdFx0XHRcdFx0XHRjYXNlICdPRkYnOlxuXHRcdFx0XHRcdFx0XHRhZ2Mud3JpdGVJb0JpdHMoMG8zMSwgeyAxMzogMSwgMTQ6IDEgfSlcblx0XHRcdFx0XHRcdFx0YnJlYWtcblx0XHRcdFx0XHRcdGNhc2UgJ0hPTEQnOlxuXHRcdFx0XHRcdFx0XHRhZ2Mud3JpdGVJb0JpdHMoMG8zMSwgeyAxMzogMCwgMTQ6IDEgfSlcblx0XHRcdFx0XHRcdFx0YnJlYWtcblx0XHRcdFx0XHRcdGNhc2UgJ0FVVE8nOlxuXHRcdFx0XHRcdFx0XHRhZ2Mud3JpdGVJb0JpdHMoMG8zMSwgeyAxMzogMSwgMTQ6IDAgfSlcblx0XHRcdFx0XHRcdFx0YnJlYWtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uVGhjQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y29uc3QgVEhDID0gJCh0aGlzKS5nZXRWYWx1ZSgpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uVGhjQ2hhbmdlJywgVEhDKVxuXHRcdFx0XHRcdHN3aXRjaCAoVEhDKSB7XG5cdFx0XHRcdFx0XHRjYXNlICdORVVUUkFMJzpcblx0XHRcdFx0XHRcdFx0YWdjLndyaXRlSW9CaXRzKDBvMzEsIHsgNzogMSwgODogMSwgOTogMSwgMTA6IDEsIDExOiAxLCAxMjogMSB9KVxuXHRcdFx0XHRcdFx0XHRicmVha1xuXHRcdFx0XHRcdFx0Y2FzZSAnK1gnOlxuXHRcdFx0XHRcdFx0XHRhZ2Mud3JpdGVJb0JpdHMoMG8zMSwgeyA3OiAwLCA4OiAxLCA5OiAxLCAxMDogMSwgMTE6IDEsIDEyOiAxIH0pXG5cdFx0XHRcdFx0XHRcdGJyZWFrXG5cdFx0XHRcdFx0XHRjYXNlICctWCc6XG5cdFx0XHRcdFx0XHRcdGFnYy53cml0ZUlvQml0cygwbzMxLCB7IDc6IDEsIDg6IDAsIDk6IDEsIDEwOiAxLCAxMTogMSwgMTI6IDEgfSlcblx0XHRcdFx0XHRcdFx0YnJlYWtcblx0XHRcdFx0XHRcdGNhc2UgJytZJzpcblx0XHRcdFx0XHRcdFx0YWdjLndyaXRlSW9CaXRzKDBvMzEsIHsgNzogMSwgODogMSwgOTogMCwgMTA6IDEsIDExOiAxLCAxMjogMSB9KVxuXHRcdFx0XHRcdFx0XHRicmVha1xuXHRcdFx0XHRcdFx0Y2FzZSAnLVknOlxuXHRcdFx0XHRcdFx0XHRhZ2Mud3JpdGVJb0JpdHMoMG8zMSwgeyA3OiAxLCA4OiAxLCA5OiAxLCAxMDogMCwgMTE6IDEsIDEyOiAxIH0pXG5cdFx0XHRcdFx0XHRcdGJyZWFrXG5cdFx0XHRcdFx0XHRjYXNlICcrWic6XG5cdFx0XHRcdFx0XHRcdGFnYy53cml0ZUlvQml0cygwbzMxLCB7IDc6IDEsIDg6IDEsIDk6IDEsIDEwOiAxLCAxMTogMCwgMTI6IDEgfSlcblx0XHRcdFx0XHRcdFx0YnJlYWtcblx0XHRcdFx0XHRcdGNhc2UgJy1aJzpcblx0XHRcdFx0XHRcdFx0YWdjLndyaXRlSW9CaXRzKDBvMzEsIHsgNzogMSwgODogMSwgOTogMSwgMTA6IDEsIDExOiAxLCAxMjogMCB9KVxuXHRcdFx0XHRcdFx0XHRicmVha1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25Sb2xsQ2hhbmdlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25Sb2xsQ2hhbmdlJywgY3RybC5tb2RlbC5yb2xsKVxuXHRcdFx0XHRcdHdyaXRlX3JoYyhjdHJsLm1vZGVsLnJvbGwsIDBvMTcwLCA1LCA2KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblBpdGNoQ2hhbmdlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25QaXRjaENoYW5nZScsIGN0cmwubW9kZWwucGl0Y2gpXG5cdFx0XHRcdFx0d3JpdGVfcmhjKGN0cmwubW9kZWwucGl0Y2gsIDBvMTY2LCAxLCAyKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbllhd0NoYW5nZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uWWF3Q2hhbmdlJywgY3RybC5tb2RlbC55YXcpXG5cdFx0XHRcdFx0d3JpdGVfcmhjKGN0cmwubW9kZWwueWF3LCAwbzE2NywgMywgNClcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGZ1bmN0aW9uIHdyaXRlX3JoYyh2YWwsIGNoYW4sIGJpdDEsIGJpdDIpIHtcblx0XHRcdGNvbnN0IGJpdDE1ID0gYWdjLmdldENoYW5uZWxCaXRTdGF0ZSgwbzMxLCAxNSlcblx0XHRcdGxldCBiaXRzID0ge31cblx0XHRcdGlmKHZhbCA8IDApIHtcblx0XHRcdFx0aWYgKGJpdDE1ID09IDEpIHtcblx0XHRcdFx0XHRiaXRzW2JpdDFdID0gMVxuXHRcdFx0XHRcdGJpdHNbYml0Ml0gPSAwXG5cdFx0XHRcdFx0c2V0VGltZW91dChyZXNldF9yaGMsIDEwMClcblx0XHRcdFx0fVxuXHRcdFx0XHRiaXRzWzE1XSA9IDBcblx0XHRcdFx0dmFsID0gKC12YWwpIF4weDdGRkYgLy8gY29udmVydHMgdG8gb25lcy1jb21wbGVtZW50XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmICh2YWwgPiAwKSB7XG5cdFx0XHRcdGlmIChiaXQxNSA9PSAxKSB7XG5cdFx0XHRcdFx0Yml0c1tiaXQxXSA9IDBcblx0XHRcdFx0XHRiaXRzW2JpdDJdID0gMVxuXHRcdFx0XHRcdHNldFRpbWVvdXQocmVzZXRfcmhjLCAxMDApXG5cdFx0XHRcdH1cblx0XHRcdFx0Yml0c1sxNV0gPSAwXG5cdFx0XHR9XG5cblx0XHRcdC8vY29uc29sZS5sb2coJ2JpdHMnLCBiaXRzKVxuXHRcdFx0YWdjLndyaXRlSW9CaXRzKDBvMzEsIGJpdHMpXG5cdFx0XHRhZ2Mud3JpdGVJbyhjaGFuLCB2YWwpXG5cblx0XHRcdGNvbnN0IHtyb2xsLCBwaXRjaCwgeWF3fSA9IGN0cmwubW9kZWxcblx0XHRcdGlmIChyb2xsID09IDAgJiYgcGl0Y2ggPT0gMCAmJiB5YXcgPT0gMCAmJiBiaXQxNSA9PSAwKSB7XG5cdFx0XHRcdGFnYy53cml0ZUlvQml0KDBvMzEsIDE1LCAxKVxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmVzZXRfcmhjKCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ3Jlc2V0X3JoYycpXG5cdFx0XHRhZ2Mud3JpdGVJb0JpdHMoMG8zMSwgezE6IDEsIDI6IDEsIDM6IDEsIDQ6IDEsIDU6IDEsIDY6IDF9KVxuXHRcdH1cblxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIi8vIEB0cy1jaGVja1xuXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnT1VUUFVUJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXY+XFxuICAgIDxmaWVsZHNldD5cXG4gICAgICAgIDxsZWdlbmQ+UkNTIEpFVCBDT05UUk9MPC9sZWdlbmQ+XFxuICAgICAgICA8ZGl2PlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcInF1YWRcXFwiPlxcbiAgICAgICAgICAgICAgICA8bGFiZWw+UVVBRCAxPC9sYWJlbD5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGJuLXN0eWxlPVxcXCJRMURcXFwiIGNsYXNzPVxcXCJvbmVcXFwiPkQ8L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBibi1zdHlsZT1cXFwiUTFGXFxcIiBjbGFzcz1cXFwidHdvXFxcIj5GPC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gYm4tc3R5bGU9XFxcIlExTFxcXCIgY2xhc3M9XFxcInRocmVlXFxcIj5MPC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gYm4tc3R5bGU9XFxcIlExVVxcXCIgY2xhc3M9XFxcImZvdXJcXFwiPlU8L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwicXVhZFxcXCI+XFxuICAgICAgICAgICAgICAgIDxsYWJlbD5RVUFEIDQ8L2xhYmVsPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gYm4tc3R5bGU9XFxcIlE0RlxcXCIgY2xhc3M9XFxcIm9uZVxcXCI+Rjwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGJuLXN0eWxlPVxcXCJRNERcXFwiIGNsYXNzPVxcXCJ0d29cXFwiPkQ8L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBibi1zdHlsZT1cXFwiUTRVXFxcIiBjbGFzcz1cXFwidGhyZWVcXFwiPlU8L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBibi1zdHlsZT1cXFwiUTRSXFxcIiBjbGFzcz1cXFwiZm91clxcXCI+Ujwvc3Bhbj5cXG4gICAgICAgICAgICA8L2Rpdj4gICAgXFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXY+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwicXVhZFxcXCI+XFxuICAgICAgICAgICAgICAgIDxsYWJlbD5RVUFEIDI8L2xhYmVsPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gYm4tc3R5bGU9XFxcIlEyTFxcXCIgY2xhc3M9XFxcIm9uZVxcXCI+TDwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGJuLXN0eWxlPVxcXCJRMlVcXFwiIGNsYXNzPVxcXCJ0d29cXFwiPlU8L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBibi1zdHlsZT1cXFwiUTJEXFxcIiBjbGFzcz1cXFwidGhyZWVcXFwiPkQ8L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBibi1zdHlsZT1cXFwiUTJBXFxcIiBjbGFzcz1cXFwiZm91clxcXCI+QTwvc3Bhbj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJxdWFkXFxcIj5cXG4gICAgICAgICAgICAgICAgPGxhYmVsPlFVQUQgMzwvbGFiZWw+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBibi1zdHlsZT1cXFwiUTNVXFxcIiBjbGFzcz1cXFwib25lXFxcIj5VPC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gYm4tc3R5bGU9XFxcIlEzUlxcXCIgY2xhc3M9XFxcInR3b1xcXCI+Ujwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGJuLXN0eWxlPVxcXCJRM0FcXFwiIGNsYXNzPVxcXCJ0aHJlZVxcXCI+QTwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGJuLXN0eWxlPVxcXCJRM0RcXFwiIGNsYXNzPVxcXCJmb3VyXFxcIj5EPC9zcGFuPlxcbiAgICAgICAgICAgIDwvZGl2PiAgICBcXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2ZpZWxkc2V0PlxcblxcbiAgICA8ZmllbGRzZXQ+XFxuICAgICAgICA8bGVnZW5kPkNEVTwvbGVnZW5kPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZmllbGRcXFwiPlxcbiAgICAgICAgICAgIDxzcGFuIGJuLXN0eWxlPVxcXCJDRFVaXFxcIj5EUklWRSBDRFUgWjwvc3Bhbj5cXG4gICAgICAgICAgICA8c3BhbiBibi1zdHlsZT1cXFwiQ0RVWVxcXCI+RFJJVkUgQ0RVIFk8L3NwYW4+XFxuICAgICAgICAgICAgPHNwYW4gYm4tc3R5bGU9XFxcIkNEVVhcXFwiPkRSSVZFIENEVSBYPC9zcGFuPlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZmllbGRzZXQ+XFxuXFxuICAgIDxmaWVsZHNldD5cXG4gICAgICAgIDxsZWdlbmQ+SEFORCBDT05UUk9MTEVSPC9sZWdlbmQ+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmaWVsZFxcXCI+XFxuICAgICAgICAgICAgPHNwYW4gYm4tc3R5bGU9XFxcIlJIQ19DT1VOVEVSX0VBTkJMRVxcXCI+UkhDIENPVU5URVIgRU5BQkxFPC9zcGFuPlxcbiAgICAgICAgICAgIDxzcGFuIGJuLXN0eWxlPVxcXCJTVEFSVF9SSENfUkVBRFxcXCI+U1RBUlQgUkhDIFJFQUQ8L3NwYW4+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9maWVsZHNldD5cXG48L2Rpdj5cIixcblxuXHRkZXBzOiBbJ2FwcC5lbXVBZ2MnXSxcblxuXHRwcm9wczoge1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtBcHBBZ2MuU2VydmljZXMuQUdDLkludGVyZmFjZX0gYWdjXG5cdCAqL1xuXHRpbml0OiBmdW5jdGlvbiAoZWx0LCBhZ2MpIHtcblxuXHRcdGNvbnN0IGJpdCA9IGFnYy5iaXRcblxuXHRcdGZ1bmN0aW9uIGdldENvbG9yKHZhbHVlKSB7XG5cdFx0XHRyZXR1cm4geyAnYmFja2dyb3VuZC1jb2xvcic6IHZhbHVlID8gJyNmZmZmZmYnIDogJ3RyYW5zcGFyZW50JyB9XG5cdFx0fVxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRjaGFubmVsNTogMCxcblx0XHRcdFx0Y2hhbm5lbDY6IDAsXG5cdFx0XHRcdGNoYW5uZWwxNDogMCxcblx0XHRcdFx0Y2hhbm5lbDEzOiAwLFxuXHRcdFx0XHRDRFVaOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGdldENvbG9yKGJpdCh0aGlzLmNoYW5uZWwxNCwgMTMpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRDRFVZOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGdldENvbG9yKGJpdCh0aGlzLmNoYW5uZWwxNCwgMTQpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRDRFVYOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGdldENvbG9yKGJpdCh0aGlzLmNoYW5uZWwxNCwgMTUpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRRNFU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gZ2V0Q29sb3IoYml0KHRoaXMuY2hhbm5lbDUsIDEpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRRNEQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gZ2V0Q29sb3IoYml0KHRoaXMuY2hhbm5lbDUsIDIpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRRM1U6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gZ2V0Q29sb3IoYml0KHRoaXMuY2hhbm5lbDUsIDMpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRRM0Q6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gZ2V0Q29sb3IoYml0KHRoaXMuY2hhbm5lbDUsIDQpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRRMlU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gZ2V0Q29sb3IoYml0KHRoaXMuY2hhbm5lbDUsIDUpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRRMkQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gZ2V0Q29sb3IoYml0KHRoaXMuY2hhbm5lbDUsIDYpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRRMVU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gZ2V0Q29sb3IoYml0KHRoaXMuY2hhbm5lbDUsIDcpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRRMUQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gZ2V0Q29sb3IoYml0KHRoaXMuY2hhbm5lbDUsIDgpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRRM0E6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gZ2V0Q29sb3IoYml0KHRoaXMuY2hhbm5lbDYsIDEpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRRNEY6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gZ2V0Q29sb3IoYml0KHRoaXMuY2hhbm5lbDYsIDIpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRRMUY6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gZ2V0Q29sb3IoYml0KHRoaXMuY2hhbm5lbDYsIDMpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRRMkE6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gZ2V0Q29sb3IoYml0KHRoaXMuY2hhbm5lbDYsIDQpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRRMkw6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gZ2V0Q29sb3IoYml0KHRoaXMuY2hhbm5lbDYsIDUpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRRM1I6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gZ2V0Q29sb3IoYml0KHRoaXMuY2hhbm5lbDYsIDYpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRRNFI6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gZ2V0Q29sb3IoYml0KHRoaXMuY2hhbm5lbDYsIDcpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRRMUw6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gZ2V0Q29sb3IoYml0KHRoaXMuY2hhbm5lbDYsIDgpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRSSENfQ09VTlRFUl9FQU5CTEU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBnZXRDb2xvcihiaXQodGhpcy5jaGFubmVsMTMsIDgpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRTVEFSVF9SSENfUkVBRDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGdldENvbG9yKGJpdCh0aGlzLmNoYW5uZWwxMywgOSkpXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0dGhpcy51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRjaGFubmVsNTogYWdjLmdldENoYW5uZWxTdGF0ZSgwbzUpLFxuXHRcdFx0XHRjaGFubmVsNjogYWdjLmdldENoYW5uZWxTdGF0ZSgwbzYpLFxuXHRcdFx0XHRjaGFubmVsMTM6IGFnYy5nZXRDaGFubmVsU3RhdGUoMG8xMyksXG5cdFx0XHRcdGNoYW5uZWwxNDogYWdjLmdldENoYW5uZWxTdGF0ZSgwbzE0KVxuXHRcdFx0IH0pXG5cdFx0fVxuXG5cdH1cblxuXG59KTtcblxuXG5cblxuIiwiLy8gQHRzLWNoZWNrXG5cbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdTSU1VJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXY+XFxuICAgIDxmaWVsZHNldD5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImRhdGFcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5TSU1VTEFUSU9OIFRJTUU6PC9sYWJlbD5cXG4gICAgICAgICAgICA8ZGl2PlxcbiAgICAgICAgICAgICAgICA8c3BhbiBibi10ZXh0PVxcXCJTaW11bGF0aW9uX1RpbWVyX3RleHRcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcInVuaXRcXFwiPlNFQzwvc3Bhbj4gICAgXFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImRhdGFcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5MTSBXRUlHSFQ6PC9sYWJlbD5cXG4gICAgICAgICAgICA8ZGl2PlxcbiAgICAgICAgICAgICAgICA8c3BhbiBibi10ZXh0PVxcXCJMTV9XZWlnaHRfS0dfdGV4dFxcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cXFwidW5pdFxcXCI+S0c8L3NwYW4+ICAgIFxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuXFxuICAgIDwvZmllbGRzZXQ+XFxuICAgIDxmaWVsZHNldD5cXG4gICAgICAgIDxsZWdlbmQ+REVTQ0VOVDwvbGVnZW5kPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZGF0YVxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPlRIUlVTVDo8L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXY+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGJuLXRleHQ9XFxcIkRlc2NlbnRfVGhydXN0X1Byb2NlbnRfdGV4dFxcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cXFwidW5pdFxcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkYXRhXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+UFJPUEVMTEFOVDo8L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXY+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGJuLXRleHQ9XFxcIkRlc2NlbnRfUHJvcGVsbGFudF9NYXNzX0tHX3RleHRcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcInVuaXRcXFwiPktHPC9zcGFuPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkYXRhXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+RlVFTCBGTE9XOjwvbGFiZWw+XFxuICAgICAgICAgICAgPGRpdj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gYm4tdGV4dD1cXFwiRGVzY2VudF9GdWVsX0Zsb3dfU0VDX3RleHRcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcInVuaXRcXFwiPktHL1M8L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImRhdGFcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5BQ0NFTEVSQVRJT046PC9sYWJlbD5cXG4gICAgICAgICAgICA8ZGl2PlxcbiAgICAgICAgICAgICAgICA8c3BhbiBibi10ZXh0PVxcXCJEZXNjZW50X0FjY2VsZXJhdGlvbl90ZXh0XFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJ1bml0XFxcIj5NL1PCsjwvc3Bhbj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBibi1zaG93PVxcXCIhaXNTZXBhcmF0ZWRcXFwiPlxcbiAgICAgICAgICAgIDxkaXY+XFxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgYm4tdmFsPVxcXCJERVNDRU5UX0VOR0lORV9GTEFHXFxcIiBibi11cGRhdGU9XFxcImNsaWNrXFxcIj5cXG4gICAgICAgICAgICAgICAgPGxhYmVsPkVOR0lORSBPTi9PRkY8L2xhYmVsPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImRhdGFcXFwiPlxcbiAgICAgICAgICAgICAgICA8bGFiZWw+VGhydXN0PC9sYWJlbD5cXG4gICAgICAgICAgICAgICAgPGRpdj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGJuLXRleHQ9XFxcIkRlc2NlbnRfUHJvcHVsc2lvbl9OXFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cXFwidW5pdFxcXCI+Tjwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLnNsaWRlclxcXCIgYm4tZGF0YT1cXFwie21pbjogRGVzY2VudF9Qcm9wdWxzaW9uX01pbl9OLCBtYXg6IERlc2NlbnRfUHJvcHVsc2lvbl9NYXhfTiB9XFxcIlxcbiAgICAgICAgICAgICAgICBibi11cGRhdGU9XFxcImlucHV0XFxcIiBibi12YWw9XFxcIkRlc2NlbnRfUHJvcHVsc2lvbl9OXFxcIj48L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2ZpZWxkc2V0PlxcbiAgICA8ZmllbGRzZXQ+XFxuICAgICAgICA8bGVnZW5kPlN0YWdlPC9sZWdlbmQ+XFxuICAgICAgICA8YnV0dG9uIGJuLWV2ZW50PVxcXCJjbGljazogb25TZXBlcmF0ZVN0YWdlXFxcIiBibi1wcm9wPVxcXCJ7ZGlzYWJsZWQ6IGlzU2VwYXJhdGVkfVxcXCI+U0VQQVJBVEUgU1RBR0U8L2J1dHRvbj5cXG4gICAgPC9maWVsZHNldD5cXG4gICAgPGZpZWxkc2V0PlxcbiAgICAgICAgPGxlZ2VuZD5BU0NFTlQ8L2xlZ2VuZD5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImRhdGFcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5QUk9QRUxMQU5UOjwvbGFiZWw+XFxuICAgICAgICAgICAgPGRpdj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gYm4tdGV4dD1cXFwiQXNjZW50X1Byb3BlbGxhbnRfTWFzc19LR190ZXh0XFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJ1bml0XFxcIj5LRzwvc3Bhbj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZGF0YVxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPkZVRUwgRkxPVzo8L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXY+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGJuLXRleHQ9XFxcIkFzY2VudF9GdWVsX0Zsb3dfU0VDX3RleHRcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcInVuaXRcXFwiPktHL1M8L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImRhdGFcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5BQ0NFTEVSQVRJT046PC9sYWJlbD5cXG4gICAgICAgICAgICA8ZGl2PlxcbiAgICAgICAgICAgICAgICA8c3BhbiBibi10ZXh0PVxcXCJBc2NlbnRfQWNjZWxlcmF0aW9uX3RleHRcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcInVuaXRcXFwiPk0vU8KyPC9zcGFuPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGJuLXNob3c9XFxcImlzU2VwYXJhdGVkXFxcIj5cXG4gICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGJuLXZhbD1cXFwiQVNDRU5UX0VOR0lORV9GTEFHXFxcIiBibi11cGRhdGU9XFxcImNsaWNrXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+RU5HSU5FIE9OL09GRjwvbGFiZWw+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9maWVsZHNldD5cXG4gICAgPGZpZWxkc2V0PlxcbiAgICAgICAgPGxlZ2VuZD5SQ1M8L2xlZ2VuZD5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImRhdGFcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5QUk9QRUxMQU5UOjwvbGFiZWw+XFxuICAgICAgICAgICAgPGRpdj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gYm4tdGV4dD1cXFwiUkNTX1Byb3BlbGxhbnRfTWFzc19LR190ZXh0XFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJ1bml0XFxcIj5LRzwvc3Bhbj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcblxcbiAgICA8L2ZpZWxkc2V0PlxcbiAgICA8ZmllbGRzZXQ+XFxuICAgICAgICA8bGVnZW5kPkVVTEVSIEFOR0xFPC9sZWdlbmQ+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkYXRhXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+WUFXOjwvbGFiZWw+XFxuICAgICAgICAgICAgPGRpdj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gYm4tdGV4dD1cXFwieWF3XFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJ1bml0XFxcIj7CsDwvc3Bhbj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZGF0YVxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPlBJVENIOjwvbGFiZWw+XFxuICAgICAgICAgICAgPGRpdj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gYm4tdGV4dD1cXFwicGl0Y2hcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcInVuaXRcXFwiPsKwPC9zcGFuPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkYXRhXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+Uk9MTDo8L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXY+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGJuLXRleHQ9XFxcInJvbGxcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcInVuaXRcXFwiPsKwPC9zcGFuPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZmllbGRzZXQ+XFxuXFxuPC9kaXY+XCIsXG5cblx0cHJvcHM6IHtcblx0fSxcblxuXHQvKipcblx0ICogXG5cdCAqL1xuXHRpbml0OiBmdW5jdGlvbiAoZWx0KSB7XG5cblx0XHRjb25zdCBQSSA9IE1hdGguUElcblx0XHRjb25zdCBQSTQgPSBQSSAvIDRcblx0XHRjb25zdCBSQURfVE9fREVHX1BJNCA9IDE4MCAvIFBJICogUEk0XG5cdFx0Y29uc3QgYWJzID0gTWF0aC5hYnNcblxuXHRcdC8vIFNpbXVsYXRpb24gU3RhcnQgVmFsdWVzXG5cblx0XHRsZXQgTE1fV2VpZ2h0X0tHID0gMFxuXHRcdGxldCBMTV9XZWlnaHRfQXNjZW50X0tHID0gNDY3MFxuXHRcdGxldCBMTV9XZWlnaHRfRGVzY2VudF9LRyA9IDEwNjk0XG5cblx0XHQvLyBSZWFjdGlvbiBDb250cm9sIFN5c3RlbVxuXHRcdGxldCBSQ1NfUHJvcGVsbGFudF9NYXNzX0tHID0gMjg3XG5cdFx0bGV0IFJDU19UaHJ1c3RfTiA9IDQ0NVxuXHRcdGxldCBSQ1NfU3BlY2lmaWNfSW1wdWxzZV9NUyA9IDI4NDBcblxuXHRcdC8vIERlc2NlbnQgRW5naW5lXG5cdFx0bGV0IERlc2NlbnRfUHJvcGVsbGFudF9NYXNzX0tHID0gODM1NVxuXHRcdGxldCBEZXNjZW50X1Byb3B1bHNpb25fTWF4X04gPSA0NTA0MFxuXHRcdGxldCBEZXNjZW50X1Byb3B1bHNpb25fTWluX04gPSA0NTYwXG5cdFx0bGV0IERlc2NlbnRfU3BlY2lmaWNfSW1wdWxzZV9NUyA9IDMwNTBcblxuXHRcdGxldCBEZXNjZW50X1Byb3B1bHNpb25fTiA9IERlc2NlbnRfUHJvcHVsc2lvbl9NaW5fTlxuXHRcdGxldCBEZXNjZW50X0Z1ZWxfRmxvd19TRUMgPSAwXG5cdFx0bGV0IERlc2NlbnRfVGhydXN0X1Byb2NlbnQgPSAwXG5cdFx0bGV0IERlc2NlbnRfQWNjZWxlcmF0aW9uID0gMFxuXHRcdGxldCBERVNDRU5UX0VOR0lORV9GTEFHID0gZmFsc2VcblxuXHRcdC8vIEFzY2VudCBFbmdpbmVcblx0XHRsZXQgQXNjZW50X1Byb3BlbGxhbnRfTWFzc19LRyA9IDIzNTNcblx0XHRsZXQgQXNjZW50X1RocnVzdF9OID0gMTU2MDBcblx0XHRsZXQgQXNjZW50X1NwZWNpZmljX0ltcHVsc2VfTVMgPSAzMDUwXG5cblx0XHRsZXQgQXNjZW50X0Z1ZWxfRmxvd19TRUMgPSAwXG5cdFx0bGV0IEFzY2VudF9BY2NlbGVyYXRpb24gPSAwXG5cdFx0bGV0IEFTQ0VOVF9FTkdJTkVfRkxBRyA9IGZhbHNlXG5cblx0XHQvLyBQYXJhbWV0ZXIgdG8gY2FsY3VsYXRlIE1vbWVudCBvZiBJbmVydGlhXG5cdFx0bGV0IExNX0NPTkZJRyA9ICdERVNDRU5UJ1xuXG5cdFx0bGV0IEFscGhhX1lhdyA9IDBcblx0XHRsZXQgQWxwaGFfUGl0Y2ggPSAwXG5cdFx0bGV0IEFscGhhX1JvbGwgPSAwXG5cdFx0bGV0IE9tZWdhX1JvbGwgPSAwXG5cdFx0bGV0IE9tZWdhX1BpdGNoID0gMFxuXHRcdGxldCBPbWVnYV9ZYXcgPSAwXG5cblx0XHRjb25zdCBNb21lbnQgPSB7XG5cdFx0XHQnQVNDRU5UJzoge1xuXHRcdFx0XHRhOiBbMC4wMDY1NDQzODUyLCAwLjAwMzU3ODQzNTQsIDAuMDA1Njk0NjYzMV0sXG5cdFx0XHRcdGI6IFswLjAwMDAzMiwgICAgIDAuMTYyODYyLCAgICAgMC4wMDkzMTJdLFxuXHRcdFx0XHRjOiBbLTAuMDA2OTIzLCAgICAwLjAwMjU4OCwgICAgLTAuMDIzNjA4XVxuXHRcdFx0fSxcblx0XHRcdCdERVNDRU5UJzoge1xuXHRcdFx0XHRhOiBbMC4wMDU5MzQ3Njc0LCAwLjAwMTQ5NzkyNjQsIDAuMDAxMDQ1MTg4OV0sXG5cdFx0XHRcdGI6IFswLjAwMjk4OSwgICAgIDAuMDE4NzkxLCAgICAgMC4wMjEzNDVdLFxuXHRcdFx0XHRjOiBbMC4wMDg3MjEsICAgIC0wLjA2ODE2MywgICAgLTAuMDY2MDI3XVxuXHRcdFx0fVxuXHRcdH1cblxuXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFNpbXVsYXRpb25fVGltZXI6IDAsXG5cdFx0XHRcdERlc2NlbnRfVGhydXN0X1Byb2NlbnQsXG5cdFx0XHRcdExNX1dlaWdodF9LRyxcblx0XHRcdFx0RGVzY2VudF9Qcm9wZWxsYW50X01hc3NfS0csXG5cdFx0XHRcdERlc2NlbnRfRnVlbF9GbG93X1NFQyxcblx0XHRcdFx0RGVzY2VudF9BY2NlbGVyYXRpb24sXG5cdFx0XHRcdFJDU19Qcm9wZWxsYW50X01hc3NfS0csXG5cdFx0XHRcdEFzY2VudF9Qcm9wZWxsYW50X01hc3NfS0csXG5cdFx0XHRcdEFzY2VudF9GdWVsX0Zsb3dfU0VDLFxuXHRcdFx0XHRBc2NlbnRfQWNjZWxlcmF0aW9uLFxuXHRcdFx0XHREZXNjZW50X1Byb3B1bHNpb25fTWluX04sXG5cdFx0XHRcdERlc2NlbnRfUHJvcHVsc2lvbl9NYXhfTixcblx0XHRcdFx0RGVzY2VudF9Qcm9wdWxzaW9uX04sXG5cdFx0XHRcdERFU0NFTlRfRU5HSU5FX0ZMQUcsXG5cdFx0XHRcdEFTQ0VOVF9FTkdJTkVfRkxBRyxcblx0XHRcdFx0TE1fQ09ORklHLFxuXHRcdFx0XHRldWxlcjogWzAsIDAsIDBdLFxuXHRcdFx0XHR5YXc6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmV1bGVyWzBdLnRvRml4ZWQoMilcblx0XHRcdFx0fSxcblx0XHRcdFx0cGl0Y2g6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmV1bGVyWzFdLnRvRml4ZWQoMilcblx0XHRcdFx0fSxcblx0XHRcdFx0cm9sbDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuZXVsZXJbMl0udG9GaXhlZCgyKVxuXHRcdFx0XHR9LFxuXG5cblx0XHRcdFx0U2ltdWxhdGlvbl9UaW1lcl90ZXh0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuU2ltdWxhdGlvbl9UaW1lci50b0ZpeGVkKDEpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdERlc2NlbnRfVGhydXN0X1Byb2NlbnRfdGV4dDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLkRlc2NlbnRfVGhydXN0X1Byb2NlbnQudG9GaXhlZCgxKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRMTV9XZWlnaHRfS0dfdGV4dDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLkxNX1dlaWdodF9LRy50b0ZpeGVkKDApXG5cdFx0XHRcdH0sXG5cdFx0XHRcdERlc2NlbnRfUHJvcGVsbGFudF9NYXNzX0tHX3RleHQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5EZXNjZW50X1Byb3BlbGxhbnRfTWFzc19LRy50b0ZpeGVkKDApXG5cdFx0XHRcdH0sXG5cdFx0XHRcdERlc2NlbnRfRnVlbF9GbG93X1NFQ190ZXh0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuRGVzY2VudF9GdWVsX0Zsb3dfU0VDLnRvRml4ZWQoMilcblx0XHRcdFx0fSxcblx0XHRcdFx0RGVzY2VudF9BY2NlbGVyYXRpb25fdGV4dDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLkRlc2NlbnRfQWNjZWxlcmF0aW9uLnRvRml4ZWQoMylcblx0XHRcdFx0fSxcblx0XHRcdFx0UkNTX1Byb3BlbGxhbnRfTWFzc19LR190ZXh0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuUkNTX1Byb3BlbGxhbnRfTWFzc19LRy50b0ZpeGVkKDEpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdEFzY2VudF9Qcm9wZWxsYW50X01hc3NfS0dfdGV4dDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLkFzY2VudF9Qcm9wZWxsYW50X01hc3NfS0cudG9GaXhlZCgwKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRBc2NlbnRfRnVlbF9GbG93X1NFQ190ZXh0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuQXNjZW50X0Z1ZWxfRmxvd19TRUMudG9GaXhlZCgxKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRBc2NlbnRfQWNjZWxlcmF0aW9uX3RleHQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5Bc2NlbnRfQWNjZWxlcmF0aW9uLnRvRml4ZWQoMylcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRpc1NlcGFyYXRlZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuTE1fQ09ORklHID09ICdBU0NFTlQnXG5cdFx0XHRcdH1cblxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblNlcGVyYXRlU3RhZ2U6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblNlcGVyYXRlU3RhZ2UnKVxuXHRcdFx0XHRcdExNX0NPTkZJRyA9ICdBU0NFTlQnXG5cdFx0XHRcdFx0RGVzY2VudF9Qcm9wZWxsYW50X01hc3NfS0cgPSAwXG5cdFx0XHRcdFx0TE1fV2VpZ2h0X0Rlc2NlbnRfS0cgPSAwXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtMTV9DT05GSUcsIERlc2NlbnRfUHJvcGVsbGFudF9NYXNzX0tHLCBMTV9XZWlnaHRfRGVzY2VudF9LR30pXG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHR3aW5kb3cuc2ltdSA9IGN0cmxcblxuXHRcdGZ1bmN0aW9uIG1vZGlmeV9waXBhWFlaKHlhd0RlbHRhViwgUGl0Y2hEZWx0YVYsIFJvbGxEZWx0YVYpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ21vZGlmeV9waXBhWFlaJywge3lhd0RlbHRhViwgUGl0Y2hEZWx0YVYsIFJvbGxEZWx0YVZ9KVxuXHRcdFx0ZWx0LnRyaWdnZXIoJ2RhdGEnLCB7YWNjZWxlcmF0ZTogW3lhd0RlbHRhViwgUGl0Y2hEZWx0YVYsIFJvbGxEZWx0YVZdfSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBUcmFuc2Zvcm1fQm9keUF4ZXNfU3RhYmxlTWVtYmVyKGRwLCBkcSwgZHIpIHtcblx0XHRcdGVsdC50cmlnZ2VyKCdkYXRhJywge3JvdGF0ZTogW2RwLCBkcSwgZHJdfSlcdFxuXHRcdH1cblxuXHRcdC8vIE1haW4gRW5naW5lIFNpbXVsYXRpb25cblx0XHRmdW5jdGlvbiBkeW5hbWljX3NpbXVsYXRpb24oRGVsdGFfVGltZTIpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ2R5bmFtaWNfc2ltdWxhdGlvbicsIERlbHRhX1RpbWUyKVxuXG5cdFx0XHRMTV9XZWlnaHRfS0cgPSBMTV9XZWlnaHRfQXNjZW50X0tHICsgTE1fV2VpZ2h0X0Rlc2NlbnRfS0dcblxuXHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0RGVzY2VudF9UaHJ1c3RfUHJvY2VudCxcblx0XHRcdFx0TE1fV2VpZ2h0X0tHLFxuXHRcdFx0XHREZXNjZW50X1Byb3BlbGxhbnRfTWFzc19LRyxcblx0XHRcdFx0RGVzY2VudF9GdWVsX0Zsb3dfU0VDLFxuXHRcdFx0XHREZXNjZW50X0FjY2VsZXJhdGlvbixcblx0XHRcdFx0UkNTX1Byb3BlbGxhbnRfTWFzc19LRyxcblx0XHRcdFx0QXNjZW50X1Byb3BlbGxhbnRfTWFzc19LRyxcblx0XHRcdFx0QXNjZW50X0Z1ZWxfRmxvd19TRUMsXG5cdFx0XHRcdEFzY2VudF9BY2NlbGVyYXRpb25cblx0XHRcdH0pXG5cblx0XHRcdERFU0NFTlRfRU5HSU5FX0ZMQUcgPSBjdHJsLm1vZGVsLkRFU0NFTlRfRU5HSU5FX0ZMQUdcblx0XHRcdEFTQ0VOVF9FTkdJTkVfRkxBRyA9IGN0cmwubW9kZWwuQVNDRU5UX0VOR0lORV9GTEFHXG5cblx0XHRcdC8vY29uc29sZS5sb2coJ0Rlc2NlbnRfUHJvcHVsc2lvbl9OJywgY3RybC5tb2RlbC5EZXNjZW50X1Byb3B1bHNpb25fTilcblx0XHRcdERlc2NlbnRfUHJvcHVsc2lvbl9OID0gY3RybC5tb2RlbC5EZXNjZW50X1Byb3B1bHNpb25fTlxuXG5cdFx0XHREZXNjZW50X1RocnVzdF9Qcm9jZW50ID0gIERlc2NlbnRfUHJvcHVsc2lvbl9OIC8gRGVzY2VudF9Qcm9wdWxzaW9uX01heF9OXG5cblx0XHRcdGlmIChERVNDRU5UX0VOR0lORV9GTEFHICYmIERlc2NlbnRfUHJvcGVsbGFudF9NYXNzX0tHID4gMCkge1xuXG5cdFx0XHRcdERlc2NlbnRfRnVlbF9GbG93X1NFQyA9IERlc2NlbnRfUHJvcHVsc2lvbl9OIC8gRGVzY2VudF9TcGVjaWZpY19JbXB1bHNlX01TXG5cblx0XHRcdFx0Y29uc3QgRGVzY2VudF9GdWVsX0Zsb3cgPSBEZXNjZW50X0Z1ZWxfRmxvd19TRUMgKiBEZWx0YV9UaW1lMlxuXG5cdFx0XHRcdERlc2NlbnRfUHJvcGVsbGFudF9NYXNzX0tHIC09IERlc2NlbnRfRnVlbF9GbG93XG5cblx0XHRcdFx0TE1fV2VpZ2h0X0Rlc2NlbnRfS0cgLT0gRGVzY2VudF9GdWVsX0Zsb3dcblxuXHRcdFx0XHREZXNjZW50X0FjY2VsZXJhdGlvbiA9IERlc2NlbnRfUHJvcHVsc2lvbl9OIC8gTE1fV2VpZ2h0X0tHXG5cblx0XHRcdFx0Y29uc3QgeWF3RGVsdGFWID0gRGVzY2VudF9BY2NlbGVyYXRpb24gKiBEZWx0YV9UaW1lMlxuXG5cdFx0XHRcdG1vZGlmeV9waXBhWFlaKHlhd0RlbHRhViwgMCwgMClcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRERVNDRU5UX0VOR0lORV9GTEFHID0gZmFsc2Vcblx0XHRcdFx0RGVzY2VudF9BY2NlbGVyYXRpb24gPSAwXG5cdFx0XHRcdERlc2NlbnRfRnVlbF9GbG93X1NFQyA9IDBcblx0XHRcdH1cblxuXHRcdFx0aWYgKEFTQ0VOVF9FTkdJTkVfRkxBRyAmJiBBc2NlbnRfUHJvcGVsbGFudF9NYXNzX0tHID4gMCkge1xuXG5cdFx0XHRcdEFzY2VudF9GdWVsX0Zsb3dfU0VDID0gQXNjZW50X1RocnVzdF9OIC8gQXNjZW50X1NwZWNpZmljX0ltcHVsc2VfTVNcblxuXHRcdFx0XHRjb25zdCBBc2NlbnRfRnVlbF9GbG93ID0gQXNjZW50X0Z1ZWxfRmxvd19TRUMgKiBEZWx0YV9UaW1lMlxuXG5cdFx0XHRcdEFzY2VudF9Qcm9wZWxsYW50X01hc3NfS0cgLT0gQXNjZW50X0Z1ZWxfRmxvd1xuXG5cdFx0XHRcdExNX1dlaWdodF9Bc2NlbnRfS0cgLT0gQXNjZW50X0Z1ZWxfRmxvd1xuXG5cdFx0XHRcdEFzY2VudF9BY2NlbGVyYXRpb24gPSBBc2NlbnRfVGhydXN0X04gLyBMTV9XZWlnaHRfQXNjZW50X0tHXG5cblx0XHRcdFx0Y29uc3QgeWF3RGVsdGFWID0gQXNjZW50X0FjY2VsZXJhdGlvbiAqIERlbHRhX1RpbWUyXG5cblx0XHRcdFx0bW9kaWZ5X3BpcGFYWVooeWF3RGVsdGFWLCAwLCAwKVxuXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRBU0NFTlRfRU5HSU5FX0ZMQUcgPSBmYWxzZVxuXHRcdFx0XHRBc2NlbnRfQWNjZWxlcmF0aW9uID0gMFxuXHRcdFx0XHRBc2NlbnRfRnVlbF9GbG93X1NFQyA9IDBcblx0XHRcdH1cblxuXHRcdFx0Ly8gQ2FsY3VsYXRlIFNpbmdsZSBKZXQgQWNjZWxsZXJhdGlvbiAvIE1vbWVudCBvZiBJbmVydGlhIGRlcGVuZCBvbiBMTSB3ZWlnaHRcblxuXHRcdFx0Y29uc3QgbSA9IExNX1dlaWdodF9LRyAvIDY1NTM1XG5cdFx0XHRjb25zdCBbYV95YXcsIGFfcGl0Y2gsIGFfcm9sbF0gPSBNb21lbnRbTE1fQ09ORklHXS5hXG5cdFx0XHRjb25zdCBbYl95YXcsIGJfcGl0Y2gsIGJfcm9sbF0gPSBNb21lbnRbTE1fQ09ORklHXS5iXG5cdFx0XHRjb25zdCBbY195YXcsIGNfcGl0Y2gsIGNfcm9sbF0gPSBNb21lbnRbTE1fQ09ORklHXS5jXG5cblx0XHRcdEFscGhhX1lhdyAgID0gUkFEX1RPX0RFR19QSTQgKiAoYl95YXcgICArIGFfeWF3ICAgLyAobSArIGNfeWF3KSlcblx0XHRcdEFscGhhX1BpdGNoID0gUkFEX1RPX0RFR19QSTQgKiAoYl9waXRjaCArIGFfcGl0Y2ggLyAobSArIGNfcGl0Y2gpKVxuXHRcdFx0QWxwaGFfUm9sbCAgPSBSQURfVE9fREVHX1BJNCAqIChiX3JvbGwgICsgYV9yb2xsICAvIChtICsgY19yb2xsKSlcblxuXHRcdFx0Ly8gRmVlZCBBbmd1bGFyIENoYW5nZXMgKERlbHRhIFRpbWUgKiBPbWVnYSkgaW50byB0aGUgSU1VXG5cdFx0XHRUcmFuc2Zvcm1fQm9keUF4ZXNfU3RhYmxlTWVtYmVyKE9tZWdhX1lhdyAqIERlbHRhX1RpbWUyLCBPbWVnYV9QaXRjaCAqIERlbHRhX1RpbWUyLCBPbWVnYV9Sb2xsICogRGVsdGFfVGltZTIpXG5cdFx0fVxuXG5cdFx0Ly8gQ2hlY2sgQUdDIFRocnVzdGVyIFN0YXR1cyBhbmQgZmlyZSBkZWRpY2F0ZWQgUkNTIFRocnVzdGVyXG5cdFx0ZnVuY3Rpb24gdXBkYXRlX1JDUyhqZXRGaXJpbmcsIERlbHRhX1RpbWUpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ3VwZGF0ZV9SQ1MnLCBEZWx0YV9UaW1lKVxuXG5cdFx0XHRjb25zdCBbUTRVLCBRNEQsIFEzVSwgUTNELCBRMlUsIFEyRCwgUTFVLCBRMUQsIFEzQSwgUTRGLCBRMUYsIFEyQSwgUTJMLCBRM1IsIFE0UiwgUTFMXSA9IGpldEZpcmluZ1xuXHRcdFx0XG5cdFx0XHRjb25zdCBudjEgPSAoUTJEID09IDEgfHwgUTRVID09IDEpID8gUTJEICsgUTRVIDogMFxuXHRcdFx0Y29uc3QgbnYyID0gKFEyVSA9PSAxIHx8IFE0RCA9PSAxKSA/IC0oUTJVICsgUTREKSA6IDBcblxuXHRcdFx0Y29uc3QgbnUxID0gKFExRCA9PSAxIHx8IFEzVSA9PSAxKSA/IFExRCArIFEzVSA6IDBcblx0XHRcdGNvbnN0IG51MiA9IChRMVUgPT0gMSB8fCBRM0QgPT0gMSkgPyAtKFExVSArIFEzRCkgOiAwXG5cblx0XHRcdGNvbnN0IG5wMSA9IChRMUYgPT0gMSB8fCBRMkwgPT0gMSB8fCBRM0EgPT0gMSB8fCBRNFIgPT0gMSkgPyBRMUYgKyBRMkwgKyBRM0EgKyBRNFIgOiAwXG5cdFx0XHRjb25zdCBucDIgPSAoUTFMID09IDEgfHwgUTJBID09IDEgfHwgUTNSID09IDEgfHwgUTRGID09IDEpID8gLShRMUwgKyBRMkEgKyBRM1IgKyBRNEYpIDogMFxuXG5cdFx0XHRjb25zdCBudiA9IG52MSArIG52MlxuXHRcdFx0Y29uc3QgbnUgPSBudTEgKyBudTJcblx0XHRcdGNvbnN0IG5wID0gbnAxICsgbnAyXG5cblx0XHRcdC8vY29uc29sZS5sb2coe252MSwgbnYyLCBudTEsIG51MiwgbnAxLCBucDJ9KVxuXG5cdFx0XHQvLyBDaGVjayBmb3IgdHJhbnNsYXRpb25hbCBjb21tYW5kcyB0byBjYWxjdWxhdGUgY2hhbmdlIGluIExNJ3Mgc3BlZWQgYWxvbmcgdGhlIHBpbG90IGF4aXNcblxuXHRcdFx0Ly8gQWxvbmcgWWF3IEF4aXNcblx0XHRcdGxldCBSQ1NfWWF3ID0gMFxuXHRcdFx0aWYgKG52MSAhPSAwICYmIChudjEgKyBudjIgPT0gMCkpIHtcblx0XHRcdFx0aWYgKFEyRCA9PSAxKSB7XG5cdFx0XHRcdFx0UkNTX1lhdyA9IFEyRCArIFE0RFxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFJDU19ZYXcgPSAtKFEyVSArIFE0VSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAobnUxICE9IDAgJiYgKG51MSArIG51MiA9PSAwKSkge1xuXHRcdFx0XHRpZiAoUTFEID09IDEpIHtcblx0XHRcdFx0XHRSQ1NfWWF3ICs9IFExRCArIFEzRFxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFJDU19ZYXcgLT0gUTFVICsgUTNVXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKFJDU19ZYXcgIT0gMCkge1xuXHRcdFx0XHRjb25zdCB5YXdEZWx0YVYgPSBEZWx0YV9UaW1lICogUkNTX1lhdyAqIFJDU19UaHJ1c3RfTiAvIExNX1dlaWdodF9LR1xuXHRcdFx0XHRtb2RpZnlfcGlwYVhZWih5YXdEZWx0YVYsIDAsIDApXG5cdFx0XHR9XG5cblx0XHRcdC8vIEFsb25nIFBpdGNoIG9yIFJvbGwgQXhpc1xuXHRcdFx0aWYgKG5wMSAhPSAwICYmIChucDEgKyBucDIgPT0gMCkpIHtcblx0XHRcdFx0Ly8gUGl0Y2ggQXhpc1xuXHRcdFx0XHRpZiAoUTFMID09IDEpIHtcblx0XHRcdFx0XHRjb25zdCBQaXRjaERlbHRhViA9IERlbHRhX1RpbWUgKiAyICogUkNTX1RocnVzdF9OIC8gTE1fV2VpZ2h0X0tHXG5cdFx0XHRcdFx0bW9kaWZ5X3BpcGFYWVooMCwgUGl0Y2hEZWx0YVYsIDApXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoUTNSID09IDEpIHtcblx0XHRcdFx0XHRjb25zdCBQaXRjaERlbHRhViA9IC1EZWx0YV9UaW1lICogMiAqIFJDU19UaHJ1c3RfTiAvIExNX1dlaWdodF9LR1xuXHRcdFx0XHRcdG1vZGlmeV9waXBhWFlaKDAsIFBpdGNoRGVsdGFWLCAwKVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gUm9sbCBBeGlzXG5cdFx0XHRcdGlmIChRMkEgPT0gMSkge1xuXHRcdFx0XHRcdGNvbnN0IFJvbGxEZWx0YVYgPSBEZWx0YV9UaW1lICogMiAqIFJDU19UaHJ1c3RfTiAvIExNX1dlaWdodF9LR1xuXHRcdFx0XHRcdG1vZGlmeV9waXBhWFlaKDAsIDAsIFJvbGxEZWx0YVYpXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoUTFGID09IDEpIHtcblx0XHRcdFx0XHRjb25zdCBSb2xsRGVsdGFWID0gLURlbHRhX1RpbWUgKiAyICogUkNTX1RocnVzdF9OIC8gTE1fV2VpZ2h0X0tHXG5cdFx0XHRcdFx0bW9kaWZ5X3BpcGFYWVooMCwgMCwgUm9sbERlbHRhVilcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBDYWxjdWxhdGUgRGVsdGEgT21lZ2EsIE9tZWdhIGFuZCBMTSB3ZWlnaHQgY2hhbmdlXG5cdFx0XHRpZiAoUkNTX1Byb3BlbGxhbnRfTWFzc19LRyA+IDApIHtcblx0XHRcdFx0Y29uc3QgRGVsdGFfT21lZ2FfWWF3ICAgPSBBbHBoYV9ZYXcgICAqIERlbHRhX1RpbWUgKiBucFxuXHRcdFx0XHRjb25zdCBEZWx0YV9PbWVnYV9QaXRjaCA9IEFscGhhX1BpdGNoICogRGVsdGFfVGltZSAqIChudSAtIG52KVxuXHRcdFx0XHRjb25zdCBEZWx0YV9PbWVnYV9Sb2xsICA9IEFscGhhX1JvbGwgICogRGVsdGFfVGltZSAqIChudSArIG52KVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKHtEZWx0YV9PbWVnYV9ZYXcsIERlbHRhX09tZWdhX1BpdGNoLCBEZWx0YV9PbWVnYV9Sb2xsfSlcblxuXHRcdFx0XHRPbWVnYV9ZYXcgICArPSBEZWx0YV9PbWVnYV9ZYXdcblx0XHRcdFx0T21lZ2FfUGl0Y2ggKz0gRGVsdGFfT21lZ2FfUGl0Y2hcblx0XHRcdFx0T21lZ2FfUm9sbCAgKz0gRGVsdGFfT21lZ2FfUm9sbFxuXG5cdFx0XHRcdGVsdC50cmlnZ2VyKCdkYXRhJywge29tZWdhOiBbT21lZ2FfWWF3LCBPbWVnYV9QaXRjaCwgT21lZ2FfUm9sbF19KVxuXG5cdFx0XHRcdGNvbnN0IFJDU19GdWVsX0Zsb3cgPSAoYWJzKG52MSkgKyBhYnMobnYyKSArIGFicyhudTEpICsgYWJzKG51MikgKyBhYnMobnAxKSArIGFicyhucDIpKSAqIFJDU19UaHJ1c3RfTiAvIFJDU19TcGVjaWZpY19JbXB1bHNlX01TICogRGVsdGFfVGltZVxuXHRcdFx0XHRMTV9XZWlnaHRfQXNjZW50X0tHIC09IFJDU19GdWVsX0Zsb3dcblx0XHRcdFx0UkNTX1Byb3BlbGxhbnRfTWFzc19LRyAtPSBSQ1NfRnVlbF9GbG93XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5keW5hbWljX3NpbXVsYXRpb24gPSBkeW5hbWljX3NpbXVsYXRpb25cblx0XHR0aGlzLnVwZGF0ZV9SQ1MgPSB1cGRhdGVfUkNTXG5cdFx0dGhpcy5zZXREYXRhID0gZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnc2V0RGF0YScsIGRhdGEpXG5cdFx0XHRjdHJsLnNldERhdGEoZGF0YSlcblx0XHR9XG5cdH1cblxuXG59KTtcblxuXG5cblxuIl19
