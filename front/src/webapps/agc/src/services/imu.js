
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
		const DEG_TO_RAD = (PI / 180);

		const CA_ANGLE = 0.043948 * DEG_TO_RAD;
		const FA_ANGLE = 0.617981 / 3600.0 * DEG_TO_RAD;
		const ANGLE_INCR = 360.0 / 32768 * DEG_TO_RAD;
		const PIPA_INCR = 0.0585; // m/s per each PIPA pulse


		let error;
		let imu_angle;
		let pimu;
		let omega;
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

		function adjust(x, a, b) {
			return x - (b - a) * floor((x - a) / (b - a));
		}

		//************************************************************************************************
		//*** Function: Modify a specific IMU Delta Gimbal-Angle par1=X; par2=Y; par3=Z               ****
		//************************************************************************************************
		function modify_gimbal_angle(delta) {
			if (gimbalLock) return;
			let ang_delta = 0;

			for (let axis = 0; axis < 3; axis++) {
				if (delta[axis]) {
					// ---- Calculate New Angle ----
					imu_angle[axis] = adjust(imu_angle[axis] + delta[axis], 0, 2 * PI);

					// ---- Calculate Delta between the new Angle and already feeded IMU Angle ----
					const dx = adjust(imu_angle[axis] - pimu[axis], -PI, PI);

					// ---- Feed yaAGC with the new Angular Delta ----
					const sign = dx > 0 ? +1 : -1;
					let n = floor(abs(dx) / ANGLE_INCR)
					//console.log('n', n)
					pimu[axis] = adjust(pimu[axis] + sign * ANGLE_INCR * n, 0, 2 * PI);

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
		function gyro_coarse_align(chan, val) {
			//console.log('gyro_coarse_align', {chan, val})
			const sign = val & 0x4000 ? -1 : +1;
			const cdu_pulses = sign * (val & 0x3FFF);

			// ---- Coarse Align Enable ----
			if (agc.getChannelBitState(0o12, 4) == 1) {    // {$bo(12,4) == 1}
				if (chan === 124) {  // 0174
					modify_gimbal_angle([cdu_pulses * CA_ANGLE, 0, 0]);
				}
				else if (chan === 125) {  // 0175
					modify_gimbal_angle([0, cdu_pulses * CA_ANGLE, 0]);
				}
				else if (chan === 126) {  // 0176
					modify_gimbal_angle([0, 0, cdu_pulses * CA_ANGLE]);
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
		function gyro_fine_align(chan, val) {
			//console.log('gyro_fine_align', chan, val)


			const gyro_sign_minus = val & 0x4000;
			const gyro_selection_a = val & 0x2000;
			const gyro_selection_b = val & 0x1000;
			const gyro_enable = val & 0x0800;
			const sign = gyro_sign_minus ? -1 : +1;
			const gyro_pulses = sign * (val & 0x07FF);

			if (!gyro_selection_a && gyro_selection_b) {
				modify_gimbal_angle([gyro_pulses * FA_ANGLE, 0, 0]);
			}
			if (gyro_selection_a && !gyro_selection_b) {
				modify_gimbal_angle([0, gyro_pulses * FA_ANGLE, 0]);
			}
			if (gyro_selection_a && gyro_selection_b) {
				modify_gimbal_angle([0, 0, gyro_pulses * FA_ANGLE]);
			}

			update()
		}

		//***********************************************************************************************
		//*** Function: Transform angular deltas in Body Axes into Stable Member angular deltas       ***
		//***********************************************************************************************
		function rotate(delta) {
			//console.log('rotate', delta)
			// based on Transform_BodyAxes_StableMember {dp dq dr} 


			const MPI = sin(imu_angle[2]);
			const MQI = cos(imu_angle[2]) * cos(imu_angle[0]);
			const MQM = sin(imu_angle[0]);
			const MRI = -cos(imu_angle[2]) * sin(imu_angle[0]);
			const MRM = cos(imu_angle[0]);
			const nenner = MRM * MQI - MRI * MQM;

			//---- Calculate Angular Change ----
			const do_b = adjust(delta[0] - (delta[1] * MRM * MPI - delta[2] * MQM * MPI) / nenner, -PI, PI);
			const di_b = adjust((delta[1] * MRM - delta[2] * MQM) / nenner, -PI, PI);
			const dm_b = adjust((delta[2] * MQI - delta[1] * MRI) / nenner, -PI, PI);

			//--- Rad to Deg and call of Gimbal Angle Modification ----
			modify_gimbal_angle([do_b, di_b, dm_b]);
		}

		//************************************************************************************************
		//*** Function: Modify PIPA Values to match simulated Speed                                   ****
		//************************************************************************************************
		function accelerate(delta) {
			//console.log('accelerate', delta)

			// based on proc modify_pipaXYZ 
			const sinOG = sin(imu_angle[0]);
			const sinIG = sin(imu_angle[1]);
			const sinMG = sin(imu_angle[2]);
			const cosOG = cos(imu_angle[0]);
			const cosIG = cos(imu_angle[1]);
			const cosMG = cos(imu_angle[2]);

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
            update,
            accelerate,
            gyro_coarse_align,
            zero,
            gyro_fine_align,
            on: event.on.bind(event)            
        }
    }
});