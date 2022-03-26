// @ts-check

$$.control.registerControl('SIMU', {

	template: { gulp_inject: './SIMU.html' },

	deps: ['breizbot.pager'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, pager) {

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
		let ASCENT_SEPARATION = 0

		// Parameter to calculate Moment of Inertia
		let LM_CONFIG = 'DESCENT'

		let Alpha_Yaw = 0
		let Alpha_Pitch = 0
		let Alpha_Roll = 0
		let Omega_Roll = 0
		let Omega_Pitch = 0
		let Omega_Yaw = 0

		const Moment ={
			'ASCENT': {
				a: [0.0065443852, 0.0035784354, 0.0056946631],
				b: [0.000032, 0.162862, 0.009312],
				c: [-0.006923, 0.002588, -0.023608]
			},
			'DESCENT': {
				a: [0.0059347674, 0.0014979264, 0.0010451889],
				b: [0.002989, 0.018791, -0.068163],
				c: [0.008721, -0.068163, -0.066027]
			}
		}


		// Set RCS Thruster to 0
		let Q4U = 0
		let Q4D = 0
		let Q4F = 0
		let Q4R = 0

		let Q3U = 0
		let Q3D = 0
		let Q3A = 0
		let Q3R = 0

		let Q2U = 0
		let Q2D = 0
		let Q2A = 0
		let Q2L = 0

		let Q1D = 0
		let Q1F = 0
		let Q1L = 0
		let Q1U = 0


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

			Alpha_Yaw = RAD_TO_DEG_PI4 * (b_yaw + a_yaw / (m + c_yaw))
			Alpha_Pitch = RAD_TO_DEG_PI4 * (b_pitch + a_pitch / (m + c_pitch))
			Alpha_Roll = RAD_TO_DEG_PI4 * (b_roll + a_roll / (m + c_roll))

			// Feed Angular Changes (Delta Time * Omega) into the IMU
			Transform_BodyAxes_StableMember(Omega_Yaw * Delta_Time2, Omega_Pitch * Delta_Time2, Omega_Roll * Delta_Time2)
		}

		// Check AGC Thruster Status and fire dedicated RCS Thruster
		function update_RCS(Delta_Time) {
			console.log('update_RCS', Delta_Time)
			const nv1 = (Q2D == 1 || Q4U == 1) ? Q2D + Q4U : 0
			const nv2 = (Q2U == 1 || Q4D == 1) ? -(Q2U + Q4D) : 0

			const nu1 = (Q1D == 1 || Q3U == 1) ? Q1D + Q3U : 0
			const nu2 = (Q1U == 1 || Q3D == 1) ? -(Q1U + Q3D) : 0

			const np1 = (Q1F == 1 || Q2L == 1 || Q3A == 1 || Q4R == 1) ? Q1F + Q2L + Q3A + Q4R : 0
			const np2 = (Q1L == 1 || Q2A == 1 || Q3R == 1 || Q4F == 1) ? -(Q1L + Q2A + Q3R + Q4F) : 0

			const nv = nv1 + nv2
			const nu = nu1 + nu2
			const np = np1 + np2

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
				const Delta_Omega_Yaw = Alpha_Yaw * Delta_Time * np
				const Delta_Omega_Pitch = Alpha_Pitch * Delta_Time * (nu - nv)
				const Delta_Omega_Roll = Alpha_Roll * Delta_Time * (nu + nv)

				Omega_Yaw += Delta_Omega_Yaw
				Omega_Pitch += Delta_Omega_Pitch
				Omega_Roll += Delta_Omega_Roll

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




