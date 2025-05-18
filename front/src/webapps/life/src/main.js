// @ts-check
/// <reference types="@webgpu/types" />

$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: async function (elt, pager) {

		let step = 0; // Track how many simulation steps have been run

		const GRID_SIZE = 16
		const UPDATE_INTERVAL = 200; // Update every 200ms (5 times/sec)
		const WORKGROUP_SIZE = 8;

		let timer = null


		const ctrl = $$.viewController(elt, {
			data: {
				step,
				running: false
			},
			events: {
				onStart: function () {
					timer = setInterval(updateGrid, UPDATE_INTERVAL)
					ctrl.setData({running: true})
				},
				onStop: function() {
					clearInterval(timer)
					ctrl.setData({running: false})

				}
			}
		})

		/**@type {HTMLCanvasElement} */
		const canvas = ctrl.scope.canvas.get(0)




		if (!navigator.gpu) {
			throw new Error("WebGPU not supported on this browser.")
		}

		const adapter = await navigator.gpu.requestAdapter()
		if (!adapter) {
			throw new Error("No appropriate GPUAdapter found.")
		}

		const device = await adapter.requestDevice()


		const uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE])
		const uniformBuffer = device.createBuffer({
			label: 'Grid Uniforms',
			size: uniformArray.byteLength,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		})
		device.queue.writeBuffer(uniformBuffer, 0, uniformArray)

		// Create an array representing the active state of each cell.
		const cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE)

		// Create a storage buffer to hold the cell state.
		// const cellStateStorage = device.createBuffer({
		// 	label: "Cell State",
		// 	size: cellStateArray.byteLength,
		// 	usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
		// })

		// // Mark every third cell of the grid as active.
		// for (let i = 0; i < cellStateArray.length; i += 3) {
		// 	cellStateArray[i] = 1
		// }
		// device.queue.writeBuffer(cellStateStorage, 0, cellStateArray);

		// Create two storage buffers to hold the cell state.
		const cellStateStorage = [
			device.createBuffer({
				label: "Cell State A",
				size: cellStateArray.byteLength,
				usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
			}),
			device.createBuffer({
				label: "Cell State B",
				size: cellStateArray.byteLength,
				usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
			})
		];

		// Set each cell to a random state, then copy the JavaScript array 
		// into the storage buffer.
		for (let i = 0; i < cellStateArray.length; ++i) {
			cellStateArray[i] = Math.random() > 0.6 ? 1 : 0;
		}
		device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray);

		// // Mark every third cell of the first grid as active.
		// for (let i = 0; i < cellStateArray.length; i += 3) {
		// 	cellStateArray[i] = 1;
		// }
		// device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray);

		// // Mark every other cell of the second grid as active.
		// for (let i = 0; i < cellStateArray.length; i++) {
		// 	cellStateArray[i] = i % 2;
		// }
		// device.queue.writeBuffer(cellStateStorage[1], 0, cellStateArray);

		const context = canvas.getContext('webgpu')
		const canvasFormat = navigator.gpu.getPreferredCanvasFormat()
		context.configure({
			device,
			format: canvasFormat
		})

		const vertices = new Float32Array([
			//   X,    Y,
			-0.8, -0.8, // Triangle 1 (Blue)
			0.8, -0.8,
			0.8, 0.8,

			-0.8, -0.8, // Triangle 2 (Red)
			0.8, 0.8,
			-0.8, 0.8,
		])

		const vertexBuffer = device.createBuffer({
			label: 'Cell vertices',
			size: vertices.byteLength,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
		})

		device.queue.writeBuffer(vertexBuffer, 0, vertices)

		/**@type {GPUVertexBufferLayout} */
		const vertexBufferLayout = {
			arrayStride: 8,
			attributes: [{
				format: "float32x2",
				offset: 0,
				shaderLocation: 0, // Position, see vertex shader
			}],
		}

		// Create the compute shader that will process the simulation.
		const simulationShaderModule = device.createShaderModule({
			label: "Game of Life simulation shader",
			code: {
				gulp_inject: './simulationShader.wgsl'

			}

		});

		const cellShaderModule = device.createShaderModule({
			label: 'Cell shader',
			code: { gulp_inject: './shader.wgsl' }

		})

		const bindGroupLayout = device.createBindGroupLayout({
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
					buffer: { type: 'uniform' }
				},
				{
					binding: 1,
					visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
					buffer: { type: 'read-only-storage' }
				},
				{
					binding: 2,
					visibility: GPUShaderStage.COMPUTE,
					buffer: { type: 'storage' }
				}
			]
		});

		const pipelineLayout = device.createPipelineLayout({
			bindGroupLayouts: [bindGroupLayout]
		});


		const cellPipeline = device.createRenderPipeline({
			label: 'Cell pipeline',
			layout: pipelineLayout,
			vertex: {
				module: cellShaderModule,
				entryPoint: 'vertexMain',
				buffers: [vertexBufferLayout]
			},
			fragment: {
				module: cellShaderModule,
				entryPoint: 'fragmentMain',
				targets: [{
					format: canvasFormat
				}]
			}
		})

		// Create a compute pipeline that updates the game state.
		const simulationPipeline = device.createComputePipeline({
			label: "Simulation pipeline",
			layout: pipelineLayout,
			compute: {
				module: simulationShaderModule,
				entryPoint: "computeMain",
			}
		});

		// const bindGroup = device.createBindGroup({
		// 	label: "Cell renderer bind group",
		// 	layout: cellPipeline.getBindGroupLayout(0),
		// 	entries: [
		// 		{
		// 			binding: 0,
		// 			resource: { buffer: uniformBuffer }
		// 		},
		// 		{
		// 			binding: 1,
		// 			resource: { buffer: cellStateStorage[1] }
		// 		}
		// 	],

		// })


		// Create a bind group to pass the grid uniforms into the pipeline
		const bindGroups = [
			device.createBindGroup({
				label: "Cell renderer bind group A",
				layout: bindGroupLayout, // Updated Line
				entries: [{
					binding: 0,
					resource: { buffer: uniformBuffer }
				}, {
					binding: 1,
					resource: { buffer: cellStateStorage[0] }
				}, {
					binding: 2, // New Entry
					resource: { buffer: cellStateStorage[1] }
				}],
			}),
			device.createBindGroup({
				label: "Cell renderer bind group B",
				layout: bindGroupLayout, // Updated Line

				entries: [{
					binding: 0,
					resource: { buffer: uniformBuffer }
				}, {
					binding: 1,
					resource: { buffer: cellStateStorage[1] }
				}, {
					binding: 2, // New Entry
					resource: { buffer: cellStateStorage[0] }
				}],
			}),
		];

		function updateGrid() {
			const encoder = device.createCommandEncoder()

			const computePass = encoder.beginComputePass()

			computePass.setPipeline(simulationPipeline)
			computePass.setBindGroup(0, bindGroups[step % 2])
			const workgroupCount = Math.ceil(GRID_SIZE / WORKGROUP_SIZE);
			computePass.dispatchWorkgroups(workgroupCount, workgroupCount);

			computePass.end()

			step++; // Increment the step count
			ctrl.setData({step})

			const pass = encoder.beginRenderPass({
				colorAttachments: [{
					view: context.getCurrentTexture().createView(),
					loadOp: 'clear',
					storeOp: 'store',
					clearValue: { r: 0, g: 0, b: 0.4, a: 1 }

				}]
			})
			pass.setPipeline(cellPipeline)
			pass.setBindGroup(0, bindGroups[step % 2])
			pass.setVertexBuffer(0, vertexBuffer)
			pass.draw(vertices.length / 2, GRID_SIZE * GRID_SIZE) // 6 vertices, nb instance
			pass.end()

			device.queue.submit([encoder.finish()])
		}

		// Schedule updateGrid() to run repeatedly
		//setInterval(updateGrid, UPDATE_INTERVAL);

		updateGrid()



	}


});




