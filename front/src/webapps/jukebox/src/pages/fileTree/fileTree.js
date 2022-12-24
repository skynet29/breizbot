// @ts-check

$$.control.registerControl('fileTree', {

	template: { gulp_inject: './fileTree.html' },

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

		/**@type {Breizbot.Controls.FolderTree.Interface} */
		const tree = ctrl.scope.tree

		this.getButtons = function() {
			return {
				apply: {
					title: 'Apply',
					icon: 'fa fa-check',
					onClick: function() {
						pager.popPage({path: tree.getSelPath()})
					}
				}
			}
		}		

	}


});




