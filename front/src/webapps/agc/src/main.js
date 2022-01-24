// @ts-check


$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

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







