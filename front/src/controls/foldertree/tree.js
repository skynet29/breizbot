// @ts-check

$$.control.registerControl('breizbot.foldertree', {

	template: { gulp_inject: './tree.html' },

	deps: ['breizbot.files'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Files.Interface} srvFiles
	 */
	init: function (elt, srvFiles) {

		const treeInfo = [
			{ title: 'Home Files', icon: 'fa fa-home w3-text-blue', lazy: true, data: { path: '/' } },
		]

		function concatPath(path, fileName) {
			let ret = path
			if (!path.endsWith('/')) {
				ret += '/'
			}
			ret += fileName
			return ret
		}

		const treeOptions = {
			lazyLoad: function (ev, data) {
				const node = data.node
				console.log('lazyload', node.data)
				data.result = new Promise(async (resolve) => {
					const { path } = node.data
					const folders = await srvFiles.list(path, { folderOnly: true })
					//console.log('folders', folders)
					const results = folders.map((f) => {
						return {
							title: f.name,
							data: {
								path: concatPath(path, f.name)								
							},
							lazy: true,
							folder: true
						}
					})
					resolve(results)
				})
			}
		}

		const ctrl = $$.viewController(elt, {
			data: {
				treeInfo,
				treeOptions,
			},
			events: {
			}
		})

		/**@type {Brainjs.Controls.Tree.Interface} */
		const tree = ctrl.scope.tree


		this.getSelPath = function() {
			const node = tree.getActiveNode()
			return node.data.path
		}
	}


});




