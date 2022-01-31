// @ts-check

$$.control.registerControl('IMU', {

	template: { gulp_inject: './IMU.html' },

	deps: ['breizbot.pager', 'app.emuAgc'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {AppAgc.Services.Interface} agc
	 */
	init: function (elt, pager, agc) {

		const abs = Math.abs;
		const floor = Math.floor;
		const round = Math.round;
		const sqrt = Math.sqrt;
		const sin = Math.sin;
		const cos = Math.cos;
		const atan2 = Math.atan2;
		const asin = Math.asin;
		const PI = Math.PI;
		const DEG_TO_RAD = (PI / 180);
		const RAD_TO_DEG = (180 / PI);

		const radius = 75

		const CA_ANGLE = 0.043948 * DEG_TO_RAD;
		const FA_ANGLE = 0.617981 / 3600.0 * DEG_TO_RAD;
		const ANGLE_INCR = 360.0 / 32768 * DEG_TO_RAD;
		const PIPA_INCR = 0.0585; // m/s per each PIPA pulse

		const PINC = 0;
		const PCDU = 1;
		const MINC = 2;
		const MCDU = 3;

		let error;
		let imu_angle;
		let euler;
		let pimu;
		let omega;
		let pipa;
		let velocity;
		let gimbalLock;

		let sum = 0;

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
			sum = 1.0

			move_fdai_marker()

		}

		function adjust(x, a, b) {
			return x - (b - a) * floor((x - a) / (b - a));
		}

		function formatValue(val) {
			let s = (val * RAD_TO_DEG).toFixed(2)
			s = '000'.substr(0, 6 - s.length) + s
			return s
		}

		function formatValue2(val) {
			return (val * RAD_TO_DEG).toFixed(1)
		}


		const ctrl = $$.viewController(elt, {
			data: {
				imu_angle: [0, 0, 0],
				euler: [0, 0, 0],
				imux: function () {
					return formatValue(this.imu_angle[0])
				},
				imuy: function () {
					return formatValue(this.imu_angle[1])
				},
				imuz: function () {
					return formatValue(this.imu_angle[2])
				},
				roll: function () {
					return formatValue2(this.euler[0])
				},
				pitch: function () {
					return formatValue2(this.euler[1])
				},
				yaw: function () {
					return formatValue2(this.euler[2])
				}

			},
			events: {
				enableIMU: function(ev) {
					console.log('enableIMU')
					agc.writeIo(24+256, 0x2000)
					agc.writeIo(24, 0)
				},
				launch: function() {
					console.log('launch')
				}
			}
			
		})

		/**@type {HTMLCanvasElement} */
		const canvas = ctrl.scope.fdai.get(0)

		const ctx = canvas.getContext('2d')

		zero()

		// Paints the 8-ball based on the euler angles calculated by calcEuler
		function paint8ball() {
			let roll = euler[0];
			let pitch = euler[1];
			let yaw = euler[2];

			ctx.fillStyle = '#888888';
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.setTransform(1, 0, 0, 1, canvas.width / 2, canvas.height / 2);

			ctx.strokeStyle = '#FFFFFF';
			ctx.lineWidth = 2;
			for (let i = 0; i < 36; i++) {
				const angle = (i * 10) * DEG_TO_RAD;
				const l = (i % 3 ? 10 : 15);
				ctx.beginPath();
				ctx.moveTo((radius + 2) * cos(angle), (radius + 2) * sin(angle));
				ctx.lineTo((radius + l) * cos(angle), (radius + l) * sin(angle));
				ctx.stroke();
			}

			let s = 1.0;
			ctx.rotate(-roll);

			ctx.strokeStyle = '#000';
			ctx.lineWidth = 4;

			ctx.beginPath();
			ctx.fillStyle = '#FFFFFF';
			ctx.lineWidth = 1;
			ctx.arc(0, 0, radius, 0, 2 * PI, true);
			ctx.fill();
			ctx.stroke();

			ctx.save();
			ctx.beginPath();
			ctx.lineWidth = 4;
			ctx.fillStyle = '#000000';

			if (cos(pitch) < 0) {
				pitch += PI;
				ctx.arc(0, 0, radius, 0, PI, true);
			} else {
				ctx.arc(0, 0, radius, 0, PI, false);
			}
			s = sin(pitch);
			if (abs(s) < 0.001) {
				ctx.moveTo(-radius, 0);
				ctx.lineTo(radius, 0);
			} else {
				ctx.scale(1, s);
				ctx.arc(0, 0, radius, PI, 0, true);
			}
			ctx.fill();
			ctx.restore();

			ctx.save();
			ctx.beginPath();
			ctx.strokeStyle = '#aaa';
			if (cos(yaw) < 0) {
				yaw += PI;
			}
			yaw = adjust(yaw, -PI, PI);
			s = -sin(yaw);
			if (abs(s) < 0.01) {
				ctx.lineWidth = 1;
				ctx.moveTo(0, -radius);
				ctx.lineTo(0, radius);
			}
			else {
				ctx.lineWidth = 4;
				ctx.scale(s, 1);
				ctx.arc(0, 0, radius, -PI / 2, PI / 2, true);
			}
			ctx.stroke();
			ctx.restore();

			ctx.beginPath();
			ctx.strokeStyle = '#F00';
			ctx.lineWidth = 2;
			ctx.arc(0, 0, 10, 0, 2 * PI, false);
			ctx.stroke();
		}

		function move_fdai_marker() {

			//console.log('move_fdai_marker', {imu_angle, euler})
			ctrl.setData({ imu_angle, euler })

			if (abs(sum) > 0.01) {
				calcEuler();
				paint8ball();
				sum = 0;
			}
		}

		// calculates the Euler angles based on the imu reading
		function calcEuler() {
			const sinOG = sin(imu_angle[0]);
			const sinIG = sin(imu_angle[1]);
			const sinMG = sin(imu_angle[2]);
			const cosOG = cos(imu_angle[0]);
			const cosIG = cos(imu_angle[1]);
			const cosMG = cos(imu_angle[2]);

			// Extract Attitude Euler angles out of the rotation matrix Stable Member into Navigation Base ----
			// const t11 = cosIG*cosMG;
			const t12 = sinMG;
			// const t13 = -sinIG$cosMG;
			// const t21 = -cosIG*sinMG*cosOG + sinIG*sinOG;
			const t22 = cosMG * cosOG;
			const t23 = sinIG * sinMG * cosOG + cosIG * sinOG;
			const t31 = cosIG * sinMG * sinOG + sinIG * cosOG;
			const t32 = -cosMG * sinOG;
			const t33 = -sinIG * sinMG * sinOG + cosIG * cosOG;

			euler[0] = asin(t32);
			euler[1] = atan2(t31, t33);
			euler[2] = atan2(t12, t22);


			for (let axis = 0; axis < 3; axis++) {
				if (euler[axis] < -2 * PI) {
					euler[axis] += 2 * PI;
				} else if (euler[axis] >= 2 * PI) {
					euler[axis] -= 2 * PI;
				}
			}
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
					sum += abs(dx);

					// ---- Feed yaAGC with the new Angular Delta ----
					const sign = dx > 0 ? +1 : -1;
					const n = floor(abs(dx) / ANGLE_INCR);
					pimu[axis] = adjust(pimu[axis] + sign * ANGLE_INCR * n, 0, 2 * PI);

					let cdu = agc.peek(26 + axis);                        // read CDU counter (26 = 0x32 = CDUX)
					cdu = cdu & 0x4000 ? -(cdu ^ 0x7FFF) : cdu;     // converts from ones-complement to twos-complement
					cdu += sign * n;                                // adds the number of pulses 
					agc.poke(26 + axis, cdu < 0 ? (-cdu) ^ 0x7FFF : cdu);   // converts back to ones-complement and writes the counter
					//for(;n>0; n--){                
					//    sendPort(0x9A+axis, sign>0 ? PCDU : MCDU, 0xFFFF);  // 0x9A = 0232 = 0200 + 032 
					//}                  
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
			console.log('gyro_coarse_align', {chan, val})
			const sign = val & 0x4000 ? -1 : +1;
			const cdu_pulses = sign * (val & 0x3FFF);

			// ---- Coarse Align Enable ----
			if (1) {    // {$bo(12,4) == 1}
				if (chan === 124) {  // 0174
					modify_gimbal_angle([cdu_pulses * CA_ANGLE, 0, 0]);
				}
				else if (chan === 125) {  // 0175
					modify_gimbal_angle([0, cdu_pulses * CA_ANGLE, 0]);
				}
				else if (chan === 126) {  // 0176
					modify_gimbal_angle([0, 0, cdu_pulses * CA_ANGLE]);
				}

				move_fdai_marker();
			} else {
				// ---- Error Needles ----
				error[chan - 124] += cdu_pulses;
			}
		}


		//*******************************************************************************************
		//*** Function: Gyro Fine Align (will be called in case of Channel 0177 output)           ***
		//*******************************************************************************************
		function gyro_fine_align(chan, val) {
			console.log('gyro_fine_align', chan, val)


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

			move_fdai_marker();
		}

		//***********************************************************************************************
		//*** Function: Transform angular deltas in Body Axes into Stable Member angular deltas       ***
		//***********************************************************************************************
		function rotate(delta) {
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
			// based on proc modify_pipaXYZ 

			const sinOG = sin(imu_angle[0]);
			const sinIG = sin(imu_angle[1]);
			const sinMG = sin(imu_angle[2]);
			const cosOG = cos(imu_angle[0]);
			const cosIG = cos(imu_angle[1]);
			const cosMG = cos(imu_angle[2]);

			const dv = [
				cosMG * cosIG * delta[0] + (-cosOG * sinMG * cosIG + sinOG * sinIG) * delta[1] + (sinOG * sinMG * cosIG + cosOG * sinIG) * delta[2],
				sinMG * delta[0] + cosOG * cosMG * delta[1] - sinOG * cosMG * delta[2],
				-cosMG * sinIG * delta[0] + (cosOG * sinMG * sinIG + sinOG * cosIG) * delta[1] + (-sinOG * sinMG * sinIG + cosOG * cosIG) * delta[2]
			];

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

		this.update = move_fdai_marker
		this.gyro_coarse_align = gyro_coarse_align
		this.zero = zero
		this.gyro_fine_align = gyro_fine_align
	}


});




