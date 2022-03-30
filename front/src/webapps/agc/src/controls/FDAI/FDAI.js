// @ts-check

$$.control.registerControl('FDAI', {

	template: { gulp_inject: './FDAI.html' },

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




