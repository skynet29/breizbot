// @ts-check


$$.control.registerControl('rootPage', {

	template: "<div>\n    <div bn-control=\"DSKY\"></div>\n</div>",

	deps: ['breizbot.files', 'app.emuAgc'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Files.Interface} files
	 * @param {AppAgc.Services.Interface} emuAgc
	 */
	init: function (elt, files, emuAgc) {


		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
			}
		})


		async function init() {
			//await emuAgc.initWasm()

			await emuAgc.loadRom(files.assetsUrl('Luminary099.bin'))
		

		}

		init()

	}


});








// @ts-check

$$.control.registerControl('DSKY', {

	template: "\n<div class=\"top\">\n    <div class=\"left\">\n        <div class=\"col\">\n            <div><span>UPLINK ACTY</span></div>\n            <div>NO ATT</div>\n            <div>STBY</div>\n            <div>KEY REL</div>\n            <div>OPR ERR</div>\n            <div></div>\n            <div></div>\n        </div>\n\n        <div class=\"col\">\n            <div>TEMP</div>\n            <div><span>GIMBALL LOCK</span></div>\n            <div>PROG</div>\n            <div>RESTART</div>\n            <div>TRACKER</div>\n            <div>ALT</div>\n            <div>VEL</div>\n        </div>\n\n    \n    </div>\n    \n    \n    <div class=\"right\">\n        <div class=\"line\">\n            <div></div>\n            <div>\n                <div class=\"label\">PROG</div>\n                <div class=\"digit\">00</div>\n            </div>\n    \n        </div>\n        <div class=\"line\">\n            <div>\n                <div class=\"label\">VERB</div>\n                <div class=\"digit\">00</div>\n            </div>\n            <div>\n                <div class=\"label\">NOUN</div>\n                <div class=\"digit\">00</div>\n            </div>\n        </div>\n        <div class=\"digit big\">+00000</div>\n        <div class=\"digit big\">+00000</div>\n        <div class=\"digit big\">+00000</div>\n    \n    </div>\n</div>\n\n<div class=\"bottom\">\n    <div class=\"keyboard\" bn-event=\"click.key: onKey\">\n        <div>\n            <button class=\"label key\">VERB</button>\n            <button class=\"label key\">NOUN</button>\n        </div>\n        <div>\n            <button class=\"key\">+</button>\n            <button class=\"key\">-</button>\n            <button class=\"key\">0</button>\n        </div>\n        <div>\n            <button class=\"key\">8</button>\n            <button class=\"key\">5</button>\n            <button class=\"key\">2</button>\n        </div>\n        <div>\n            <button class=\"key\">9</button>\n            <button class=\"key\">6</button>\n            <button class=\"key\">3</button>\n        </div>\n        <div>\n            <button class=\"label key\">CLR</button>\n            <button class=\"label key\">PRO</button>\n            <button class=\"label key\">KEY REL</button>\n        </div>\n        <div>\n            <button class=\"label key\">ENTR</button>\n            <button class=\"label key\">RSET</button>\n        </div>\n    \n    </div>\n</div>\n",

	deps: ['breizbot.pager'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, pager) {

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

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onKey: function(ev) {
					const text = $(this).text()
					let val = keyMapping[text]
					if (val == undefined) {
						val = parseInt(text)
					}

					console.log('onKey', val)
				}
			}
		})

	}


});






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



//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJjb250cm9scy9EU0tZLmpzIiwic2VydmljZXMvZW11X2FnYy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQHRzLWNoZWNrXG5cblxuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXY+XFxuICAgIDxkaXYgYm4tY29udHJvbD1cXFwiRFNLWVxcXCI+PC9kaXY+XFxuPC9kaXY+XCIsXG5cblx0ZGVwczogWydicmVpemJvdC5maWxlcycsICdhcHAuZW11QWdjJ10sXG5cblx0cHJvcHM6IHtcblx0fSxcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuRmlsZXMuSW50ZXJmYWNlfSBmaWxlc1xuXHQgKiBAcGFyYW0ge0FwcEFnYy5TZXJ2aWNlcy5JbnRlcmZhY2V9IGVtdUFnY1xuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgZmlsZXMsIGVtdUFnYykge1xuXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHR9XG5cdFx0fSlcblxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gaW5pdCgpIHtcblx0XHRcdC8vYXdhaXQgZW11QWdjLmluaXRXYXNtKClcblxuXHRcdFx0YXdhaXQgZW11QWdjLmxvYWRSb20oZmlsZXMuYXNzZXRzVXJsKCdMdW1pbmFyeTA5OS5iaW4nKSlcblx0XHRcblxuXHRcdH1cblxuXHRcdGluaXQoKVxuXG5cdH1cblxuXG59KTtcblxuXG5cblxuXG5cblxuIiwiLy8gQHRzLWNoZWNrXG5cbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdEU0tZJywge1xuXG5cdHRlbXBsYXRlOiBcIlxcbjxkaXYgY2xhc3M9XFxcInRvcFxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImxlZnRcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiY29sXFxcIj5cXG4gICAgICAgICAgICA8ZGl2PjxzcGFuPlVQTElOSyBBQ1RZPC9zcGFuPjwvZGl2PlxcbiAgICAgICAgICAgIDxkaXY+Tk8gQVRUPC9kaXY+XFxuICAgICAgICAgICAgPGRpdj5TVEJZPC9kaXY+XFxuICAgICAgICAgICAgPGRpdj5LRVkgUkVMPC9kaXY+XFxuICAgICAgICAgICAgPGRpdj5PUFIgRVJSPC9kaXY+XFxuICAgICAgICAgICAgPGRpdj48L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2PjwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjb2xcXFwiPlxcbiAgICAgICAgICAgIDxkaXY+VEVNUDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXY+PHNwYW4+R0lNQkFMTCBMT0NLPC9zcGFuPjwvZGl2PlxcbiAgICAgICAgICAgIDxkaXY+UFJPRzwvZGl2PlxcbiAgICAgICAgICAgIDxkaXY+UkVTVEFSVDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXY+VFJBQ0tFUjwvZGl2PlxcbiAgICAgICAgICAgIDxkaXY+QUxUPC9kaXY+XFxuICAgICAgICAgICAgPGRpdj5WRUw8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcblxcbiAgICBcXG4gICAgPC9kaXY+XFxuICAgIFxcbiAgICBcXG4gICAgPGRpdiBjbGFzcz1cXFwicmlnaHRcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwibGluZVxcXCI+XFxuICAgICAgICAgICAgPGRpdj48L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2PlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJsYWJlbFxcXCI+UFJPRzwvZGl2PlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkaWdpdFxcXCI+MDA8L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgXFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImxpbmVcXFwiPlxcbiAgICAgICAgICAgIDxkaXY+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImxhYmVsXFxcIj5WRVJCPC9kaXY+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImRpZ2l0XFxcIj4wMDwvZGl2PlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXY+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImxhYmVsXFxcIj5OT1VOPC9kaXY+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImRpZ2l0XFxcIj4wMDwvZGl2PlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkaWdpdCBiaWdcXFwiPiswMDAwMDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZGlnaXQgYmlnXFxcIj4rMDAwMDA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImRpZ2l0IGJpZ1xcXCI+KzAwMDAwPC9kaXY+XFxuICAgIFxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJib3R0b21cXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJrZXlib2FyZFxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLmtleTogb25LZXlcXFwiPlxcbiAgICAgICAgPGRpdj5cXG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJsYWJlbCBrZXlcXFwiPlZFUkI8L2J1dHRvbj5cXG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJsYWJlbCBrZXlcXFwiPk5PVU48L2J1dHRvbj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdj5cXG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJrZXlcXFwiPis8L2J1dHRvbj5cXG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJrZXlcXFwiPi08L2J1dHRvbj5cXG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJrZXlcXFwiPjA8L2J1dHRvbj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdj5cXG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJrZXlcXFwiPjg8L2J1dHRvbj5cXG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJrZXlcXFwiPjU8L2J1dHRvbj5cXG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJrZXlcXFwiPjI8L2J1dHRvbj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdj5cXG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJrZXlcXFwiPjk8L2J1dHRvbj5cXG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJrZXlcXFwiPjY8L2J1dHRvbj5cXG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJrZXlcXFwiPjM8L2J1dHRvbj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdj5cXG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJsYWJlbCBrZXlcXFwiPkNMUjwvYnV0dG9uPlxcbiAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcImxhYmVsIGtleVxcXCI+UFJPPC9idXR0b24+XFxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwibGFiZWwga2V5XFxcIj5LRVkgUkVMPC9idXR0b24+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXY+XFxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwibGFiZWwga2V5XFxcIj5FTlRSPC9idXR0b24+XFxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwibGFiZWwga2V5XFxcIj5SU0VUPC9idXR0b24+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgXFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcblwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5QYWdlci5JbnRlcmZhY2V9IHBhZ2VyIFxuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIpIHtcblxuXHRcdGNvbnN0IGtleU1hcHBpbmcgPSB7XG5cdFx0XHQnVkVSQic6IDE3LFxuXHRcdFx0J05PVU4nOiAzMSxcblx0XHRcdCcrJzogMjYsXG5cdFx0XHQnLSc6IDI3LFxuXHRcdFx0JzAnOiAxNixcblx0XHRcdCdDTFInOiAzMCxcblx0XHRcdCdLRVkgUkVMJzogMjUsXG5cdFx0XHQnRU5UUic6IDI4LFxuXHRcdFx0J1JTRVQnOiAxOFxuXHRcdH1cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25LZXk6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgdGV4dCA9ICQodGhpcykudGV4dCgpXG5cdFx0XHRcdFx0bGV0IHZhbCA9IGtleU1hcHBpbmdbdGV4dF1cblx0XHRcdFx0XHRpZiAodmFsID09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0dmFsID0gcGFyc2VJbnQodGV4dClcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25LZXknLCB2YWwpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdH1cblxuXG59KTtcblxuXG5cblxuIiwiXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYXBwLmVtdUFnYycsIHtcblxuICAgIGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnXSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7Kn0gY29uZmlnIFxuICAgICAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuRmlsZXMuSW50ZXJmYWNlfSBmaWxlcyBcbiAgICAgKiBAcmV0dXJucyBcbiAgICAgKi9cbiAgICBpbml0OiBmdW5jdGlvbihjb25maWcsIGZpbGVzKSB7XG5cbiAgICAgICAgY29uc3Qgc2V0X2ZpeGVkID0gTW9kdWxlLmN3cmFwKCdzZXRfZml4ZWQnLCBudWxsLCBbJ251bWJlciddKVxuICAgICAgICAvKipAdHlwZSB7V2ViQXNzZW1ibHkuSW5zdGFuY2V9ICovXG4gICAgICAgIGxldCBpbnN0YW5jZSA9IG51bGxcblxuICAgICAgICAvKipAdHlwZSB7VWludDhBcnJheX0gKi9cbiAgICAgICAgbGV0IG1lbUFycmF5ID0gbnVsbFxuXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIGluaXRXYXNtKCkge1xuXHRcdFx0Y29uc3Qgd2FzbWZzID0gbmV3ICQkLldhc21GcygpXG5cblx0XHRcdGNvbnNvbGUubG9nKCdkZWZhdWx0QmluZGluZ3MnLCAkJC53YXNpQmluZGluZ3MpXG5cblx0XHRcdC8vY29uc3QgYmluZGluZ3MgPSAkJC5XQVNJLmRlZmF1bHRCaW5kaW5nc1xuXG5cblx0XHRcdGNvbnN0IGJpbmRpbmdzID0gJCQud2FzaUJpbmRpbmdzLmRlZmF1bHRcblxuXHRcdFx0YmluZGluZ3MuZnMgPSB3YXNtZnMuZnNcblxuXHRcdFx0Y29uc3Qgd2FzaSA9IG5ldyAkJC5XQVNJKHtcblx0XHRcdFx0cHJlb3BlbnM6IHtcblx0XHRcdFx0XHQnLyc6ICcvJyxcblx0XHRcdFx0fSxcblx0XHRcdFx0YmluZGluZ3Ncblx0XHRcdH0pXG5cblx0XHRcdGNvbnN0IG1lbSA9IG5ldyBXZWJBc3NlbWJseS5NZW1vcnkoeyBpbml0aWFsOiA1IH0pXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnbWVtJywgbWVtKVxuXHRcdFx0bWVtQXJyYXkgPSBuZXcgVWludDhBcnJheShtZW0uYnVmZmVyKVxuXHRcdFxuXG5cdFx0XHR3YXNpLnNldE1lbW9yeShtZW0pXG5cblx0XHRcdGNvbnN0IGltcG9ydHMgPSB7IGVudjogeyBtZW1vcnk6IG1lbSB9IH1cblxuXHRcdFx0Y29uc3QgbW9kdWxlID0gYXdhaXQgV2ViQXNzZW1ibHkuY29tcGlsZVN0cmVhbWluZyhmZXRjaChmaWxlcy5hc3NldHNVcmwoJ2FnYy53YXNtJykpKVxuXHRcdFx0Y29uc29sZS5sb2coJ21vZHVsZScsIG1vZHVsZSlcblx0XHRcdGNvbnN0IHsgd2FzaV9zbmFwc2hvdF9wcmV2aWV3MSB9ID0gd2FzaS5nZXRJbXBvcnRzKG1vZHVsZSlcblx0XHRcdGltcG9ydHMud2FzaV9zbmFwc2hvdF9wcmV2aWV3MSA9IHdhc2lfc25hcHNob3RfcHJldmlldzFcblxuXHRcdFx0Y29uc29sZS5sb2coJ2ltcG9ydHMnLCBpbXBvcnRzKVxuXHRcdFx0aW5zdGFuY2UgPSBhd2FpdCBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZShtb2R1bGUsIGltcG9ydHMpXG5cdFx0XHRjb25zb2xlLmxvZygnaW5zdGFuY2UnLCBpbnN0YW5jZSlcblx0XHQgIFxuXG5cdFx0fVxuXG4gICAgICAgIGZ1bmN0aW9uIHdyaXRlSW8oY2hhbm5lbCwgZGF0YSkge1xuICAgICAgICAgICAgaW5zdGFuY2UuZXhwb3J0cy5wYWNrZXRfd3JpdGUoY2hhbm5lbCwgZGF0YSlcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlYWRJbygpIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBpbnN0YW5jZS5leHBvcnRzLnBhY2tldF9yZWFkKClcbiAgICAgICAgICAgIGNvbnN0IGNoYW5uZWwgPSBkYXRhID4+IDE2XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGRhdGEgJiAweGZmZmZcbiAgICAgICAgICAgIHJldHVybiB7Y2hhbm5lbCwgdmFsdWV9XG4gICAgICAgIH1cblxuICAgICAgICBhc3luYyBmdW5jdGlvbiBsb2FkUm9tKHVybCkge1xuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwpXG4gICAgICAgICAgICBjb25zdCBiaW5hcnkgPSBhd2FpdCByZXNwb25zZS5hcnJheUJ1ZmZlcigpXG5cbiAgICAgICAgICAgIGNvbnN0IHJvbUFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoYmluYXJ5KVxuICAgICAgICAgICAgY29uc29sZS5sb2coJ3JvbUFycmF5Jywgcm9tQXJyYXkubGVuZ3RoKVxuICAgICAgICAgICAgY29uc3Qgcm9tUHRyID0gTW9kdWxlLl9tYWxsb2Mocm9tQXJyYXkubGVuZ3RoICogcm9tQXJyYXkuQllURVNfUEVSX0VMRU1FTlQpXG4gICAgICAgICAgICBjb25zb2xlLmxvZygncm9tUHRyJywgcm9tUHRyKVxuICAgICAgICBcbiAgICAgICAgICAgIE1vZHVsZS5IRUFQOC5zZXQocm9tQXJyYXksIHJvbVB0cilcbiAgICAgICAgICAgIHNldF9maXhlZChyb21QdHIpXG4gICAgICAgICAgICBNb2R1bGUuX2ZyZWUocm9tUHRyKVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5leHBvcnRzLmNwdV9yZXNldCgpXG4gICAgICAgICAgfSAgICAgICAgXG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGluaXRXYXNtLFxuICAgICAgICAgICAgd3JpdGVJbyxcbiAgICAgICAgICAgIHJlYWRJbyxcbiAgICAgICAgICAgIGxvYWRSb20sXG4gICAgICAgICAgICByZXNldFxuICAgICAgICB9XG5cbiAgICB9XG59KVxuXG5cbiJdfQ==
