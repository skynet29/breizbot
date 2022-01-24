
$$.service.registerService('app.emuAgc', {

    deps: ['breizbot.files'],

    /**
     * 
     * @param {*} config 
     * @param {Breizbot.Services.Files.Interface} files 
     * @returns 
     */
    init: function(config, files) {

        const set_fixed = Module.cwrap('set_fixed', null, ['number'])
        /**@type {WebAssembly.Instance} */
        let instance = null

        /**@type {Uint8Array} */
        let memArray = null

        async function initWasm() {
			const wasmfs = new $$.WasmFs()

			console.log('defaultBindings', $$.wasiBindings)

			//const bindings = $$.WASI.defaultBindings


			const bindings = $$.wasiBindings.default

			bindings.fs = wasmfs.fs

			const wasi = new $$.WASI({
				preopens: {
					'/': '/',
				},
				bindings
			})

			const mem = new WebAssembly.Memory({ initial: 5 })
            console.log('mem', mem)
			memArray = new Uint8Array(mem.buffer)
		

			wasi.setMemory(mem)

			const imports = { env: { memory: mem } }

			const module = await WebAssembly.compileStreaming(fetch(files.assetsUrl('agc.wasm')))
			console.log('module', module)
			const { wasi_snapshot_preview1 } = wasi.getImports(module)
			imports.wasi_snapshot_preview1 = wasi_snapshot_preview1

			console.log('imports', imports)
			instance = await WebAssembly.instantiate(module, imports)
			console.log('instance', instance)
		  

		}

        function writeIo(channel, data) {
            instance.exports.packet_write(channel, data)
        }

        function readIo() {
            const data = instance.exports.packet_read()
            const channel = data >> 16
            const value = data & 0xffff
            return {channel, value}
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
        }

        function reset() {
            instance.exports.cpu_reset()
          }        

        return {
            initWasm,
            writeIo,
            readIo,
            loadRom,
            reset
        }

    }
})


