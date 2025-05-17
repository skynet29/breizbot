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
	init: function (elt, pager) {


		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
			}
		})

		/**@type {HTMLCanvasElement} */
		const canvas = ctrl.scope.canvas.get(0)

		async function initialize() {

			const GRID_SIZE = 4

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

			const vertexBufferLayout = {
				arrayStride: 8,
				attributes: [{
					format: "float32x2",
					offset: 0,
					shaderLocation: 0, // Position, see vertex shader
				}],
			}

			const cellShaderModule = device.createShaderModule({
				label: 'Cell shader',
				code: {gulp_inject: './shader.wgsl'}

			})

			const cellPipeline = device.createRenderPipeline({
				label: 'Cell pipeline',
				layout: 'auto',
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

			const bindGroup = device.createBindGroup({
				label: "Cell renderer bind group",
				layout: cellPipeline.getBindGroupLayout(0),
				entries: [{
				  binding: 0,
				  resource: { buffer: uniformBuffer }
				}],
			  })

			const encoder = device.createCommandEncoder()
			const pass = encoder.beginRenderPass({
				colorAttachments: [{
					view: context.getCurrentTexture().createView(),
					loadOp: 'clear',
					storeOp: 'store',
					clearValue: { r: 0, g: 0, b: 0.4, a: 1 }

				}]
			})
			pass.setPipeline(cellPipeline)
			pass.setBindGroup(0, bindGroup)
			pass.setVertexBuffer(0, vertexBuffer)
			pass.draw(vertices.length / 2, GRID_SIZE * GRID_SIZE) // 6 vertices, nb instance
			pass.end()

			device.queue.submit([encoder.finish()])

		}

		initialize()



	}


});




