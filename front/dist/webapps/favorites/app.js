$$.control.registerControl('addLink', {

    template: "<form bn-event=\"submit: onSubmit\">\n    <label>Name</label>\n    <input type=\"text\" required name=\"name\">\n\n    <label>link</label>\n    <input type=\"url\" required name=\"link\">\n\n    <input type=\"submit\" hidden bn-bind=\"submit\">\n</form>",

    deps: ['breizbot.pager'],

    init: function(elt, pager) {

        const ctrl = $$.viewController(elt, {
            events: {
                onSubmit: function(ev) {
                    ev.preventDefault()
                    pager.popPage($(this).getFormData())

                }
            }
        })

        this.getButtons = function() {
            return {
                apply: {
                    title: 'Apply',
                    icon: 'fas fa-check',
                    onClick: function() {
                        ctrl.scope.submit.click()
                    }
                }
            }
        }
    }
})
$$.control.registerControl('rootPage', {

	template: "<div class=\"toolbar\">\n\n    <div class=\"left\" bn-style=\"{visibility: isVisible}\">\n        <button class=\"w3-button\" title=\"Back\" bn-event=\"click: onBack\"><i class=\"fa fa-arrow-left\"></i></button>\n        <span>Edit Favorites</span>\n    </div>\n\n    <div class=\"right\">\n        <button class=\"w3-button\" title=\"Remove\" \n            bn-event=\"click: onRemove\" \n            bn-show=\"isEdited\" \n            bn-prop=\"{disabled: !canRemove}\"><i class=\"fas fa-trash\"></i></button>\n\n        <button class=\"w3-button\" title=\"Add Folder\" \n            bn-event=\"click: onAddFolder\" \n            bn-prop=\"{disabled: !canAdd}\"\n            bn-show=\"isEdited\"><i class=\"fas fa-folder-plus\"></i></button>\n    \n        <button class=\"w3-button\" title=\"Add Link\" \n            bn-event=\"click: onAddLink\" \n            bn-prop=\"{disabled: !canAdd}\"\n            bn-show=\"isEdited\"><i class=\"fas fa-link\"></i></button>\n    \n            <button class=\"w3-button\" title=\"Update\" bn-event=\"click: onUpdate\" bn-show=\"!isEdited\"><i class=\"fas fa-redo-alt\"></i></button>\n            <button class=\"w3-button\" title=\"Edit\" bn-event=\"click: onEdit\" bn-show=\"!isEdited\"><i class=\"fas fa-edit\"></i></button>\n    \n    </div>\n\n</div>\n\n<div class=\"content\">\n    <div bn-control=\"brainjs.tree\" \n    bn-data=\"{source, options}\"\n    bn-event=\"treeactivate: onItemSelected\"\n    bn-iface=\"tree\"\n    ></div>\n\n</div>\n\n",

	deps: ['breizbot.pager', 'breizbot.http'],


	init: function (elt, pager, http) {

		async function getFavorites() {
			const results = await http.post('/getFavorites')
			console.log('results', results)
			ctrl.setData({source: [results], selNode:null})
			ctrl.scope.tree.getRootNode().getFirstChild().setExpanded(true)
		}

		function addFavorite(parentId, info) {
			return http.post('/addFavorite', { parentId, info })
		}

		function removeFavorite(id) {
			return http.delete('/removeFavorite/' + id)
		}

		function changeParent(id, newParentId) {
			return http.post('/changeParent', {id, newParentId})
		}

		const ctrl = $$.viewController(elt, {
			data: {
				isEdited: false,
				selNode: null,
				isVisible: function () {
					return this.isEdited ? 'visible' : 'hidden'
				},
				canRemove: function () {
					return this.selNode != null && this.selNode.key != "0"
				},
				canAdd: function () {
					return this.selNode != null && this.selNode.isFolder()
				},
				//source: [{ title: 'Home', folder: true, lazy: true, key: "0" }],
				source: [],
				options: {
					dnd: {
						autoExpandMS: 400,
						dragStart: function() {
							//console.log('dragStart', ctrl.model.isEdited)
							return ctrl.model.isEdited
						},
						dragEnter: function(node, data) {
							//console.log('dragEnter', node.isFolder())
							if (!node.isFolder()) {
								return false
							}
							if (!node.isLoaded()) {
								return false
							}
							return ['over']
						},
						dragDrop: function(node, data) {
							//console.log('dragDrop')
							data.otherNode.moveTo(node, data.hitMode)
							node.setExpanded(true)
							changeParent(data.otherNode.key, node.key)
						}
					},
					renderNode: function (evt, data) {
						const { node } = data
						if (node.data.icon) {
							const $span = $(node.span)
							$span.css({
								display: 'flex',
								alignItems: 'center'
							})
							$span.find("> span.fancytree-icon").css({
								backgroundImage: `url(${node.data.icon})`,
								backgroundPosition: "0 0",
								backgroundSize: "16px 16px"
							})
						}

					},
					lazyLoad: function (event, data) {
						//console.log('lazyLoad')
						const parentId = data.node.key

						data.result = getFavorites(parentId).then((results) => {
							//console.log('results', results)
							return results.map((i) => {
								const { name, type, link, icon } = i.info
								if (type == 'folder') {
									return {
										title: name,
										folder: true,
										lazy: true,
										key: i._id,
									}
								}
								else {
									return {
										title: name,
										key: i._id,
										data: { link, icon }
									}

								}
							})
						})
					}
				}

			},
			events: {
				onUpdate: function() {
					getFavorites()
				},
				onItemSelected: function (ev, selNode) {
					console.log('onItemSelected', selNode.title)
					// if (selNode.isFolder()) {
					// 	selNode.setExpanded(!selNode.isExpanded())
					// }
					ctrl.setData({ selNode })
					if (!ctrl.model.isEdited) {
						const { link } = selNode.data
						if (link != undefined) {
							window.open(link)
						}
						selNode.setActive(false)
					}
				},
				onEdit: function () {
					ctrl.setData({ isEdited: true, selNode: null })
				},
				onBack: function () {
					const { selNode } = ctrl.model
					if (selNode != null) {
						selNode.setActive(false)
					}
					ctrl.setData({ isEdited: false, selNode: null })
				},
				onAddFolder: async function () {
					const title = await $$.ui.showPrompt({ title: 'Add Folder', label: 'Name:' })
					if (title != null) {
						const { selNode } = ctrl.model
						const parentId = selNode.key
						const ret = await addFavorite(parentId, { type: 'folder', name: title })
						selNode.addNode({ title, folder: true, lazy: true, key: ret.id })
						selNode.setExpanded(true)
					}
				},
				onAddLink: function () {
					pager.pushPage('addLink', {
						title: 'Add Link',
						onReturn: async function (data) {
							//console.log('onReturn', data)
							const { name, link } = data
							const { selNode } = ctrl.model

							const parentId = selNode.key
							const ret = await addFavorite(parentId, { type: 'link', name, link })

							selNode.addNode({ title: name, key: ret.id, data: { link, icon: ret.info.icon } })
							selNode.setExpanded(true)
						}
					})

				},

				onRemove: async function () {
					const { selNode } = ctrl.model
					await removeFavorite(selNode.key)
					selNode.remove()
					ctrl.setData({ selNode: null })

				}

			}
		})

		getFavorites()

	}


});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkZGxpbmsuanMiLCJtYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2FkZExpbmsnLCB7XG5cbiAgICB0ZW1wbGF0ZTogXCI8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblN1Ym1pdFxcXCI+XFxuICAgIDxsYWJlbD5OYW1lPC9sYWJlbD5cXG4gICAgPGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHJlcXVpcmVkIG5hbWU9XFxcIm5hbWVcXFwiPlxcblxcbiAgICA8bGFiZWw+bGluazwvbGFiZWw+XFxuICAgIDxpbnB1dCB0eXBlPVxcXCJ1cmxcXFwiIHJlcXVpcmVkIG5hbWU9XFxcImxpbmtcXFwiPlxcblxcbiAgICA8aW5wdXQgdHlwZT1cXFwic3VibWl0XFxcIiBoaWRkZW4gYm4tYmluZD1cXFwic3VibWl0XFxcIj5cXG48L2Zvcm0+XCIsXG5cbiAgICBkZXBzOiBbJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cbiAgICBpbml0OiBmdW5jdGlvbihlbHQsIHBhZ2VyKSB7XG5cbiAgICAgICAgY29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuICAgICAgICAgICAgZXZlbnRzOiB7XG4gICAgICAgICAgICAgICAgb25TdWJtaXQ6IGZ1bmN0aW9uKGV2KSB7XG4gICAgICAgICAgICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgICAgICAgICAgcGFnZXIucG9wUGFnZSgkKHRoaXMpLmdldEZvcm1EYXRhKCkpXG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgdGhpcy5nZXRCdXR0b25zID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGFwcGx5OiB7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnQXBwbHknLFxuICAgICAgICAgICAgICAgICAgICBpY29uOiAnZmFzIGZhLWNoZWNrJyxcbiAgICAgICAgICAgICAgICAgICAgb25DbGljazogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdHJsLnNjb3BlLnN1Ym1pdC5jbGljaygpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59KSIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwibGVmdFxcXCIgYm4tc3R5bGU9XFxcInt2aXNpYmlsaXR5OiBpc1Zpc2libGV9XFxcIj5cXG4gICAgICAgIDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIkJhY2tcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25CYWNrXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtYXJyb3ctbGVmdFxcXCI+PC9pPjwvYnV0dG9uPlxcbiAgICAgICAgPHNwYW4+RWRpdCBGYXZvcml0ZXM8L3NwYW4+XFxuICAgIDwvZGl2PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJyaWdodFxcXCI+XFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJSZW1vdmVcXFwiIFxcbiAgICAgICAgICAgIGJuLWV2ZW50PVxcXCJjbGljazogb25SZW1vdmVcXFwiIFxcbiAgICAgICAgICAgIGJuLXNob3c9XFxcImlzRWRpdGVkXFxcIiBcXG4gICAgICAgICAgICBibi1wcm9wPVxcXCJ7ZGlzYWJsZWQ6ICFjYW5SZW1vdmV9XFxcIj48aSBjbGFzcz1cXFwiZmFzIGZhLXRyYXNoXFxcIj48L2k+PC9idXR0b24+XFxuXFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJBZGQgRm9sZGVyXFxcIiBcXG4gICAgICAgICAgICBibi1ldmVudD1cXFwiY2xpY2s6IG9uQWRkRm9sZGVyXFxcIiBcXG4gICAgICAgICAgICBibi1wcm9wPVxcXCJ7ZGlzYWJsZWQ6ICFjYW5BZGR9XFxcIlxcbiAgICAgICAgICAgIGJuLXNob3c9XFxcImlzRWRpdGVkXFxcIj48aSBjbGFzcz1cXFwiZmFzIGZhLWZvbGRlci1wbHVzXFxcIj48L2k+PC9idXR0b24+XFxuICAgIFxcbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiQWRkIExpbmtcXFwiIFxcbiAgICAgICAgICAgIGJuLWV2ZW50PVxcXCJjbGljazogb25BZGRMaW5rXFxcIiBcXG4gICAgICAgICAgICBibi1wcm9wPVxcXCJ7ZGlzYWJsZWQ6ICFjYW5BZGR9XFxcIlxcbiAgICAgICAgICAgIGJuLXNob3c9XFxcImlzRWRpdGVkXFxcIj48aSBjbGFzcz1cXFwiZmFzIGZhLWxpbmtcXFwiPjwvaT48L2J1dHRvbj5cXG4gICAgXFxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiVXBkYXRlXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uVXBkYXRlXFxcIiBibi1zaG93PVxcXCIhaXNFZGl0ZWRcXFwiPjxpIGNsYXNzPVxcXCJmYXMgZmEtcmVkby1hbHRcXFwiPjwvaT48L2J1dHRvbj5cXG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJFZGl0XFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uRWRpdFxcXCIgYm4tc2hvdz1cXFwiIWlzRWRpdGVkXFxcIj48aSBjbGFzcz1cXFwiZmFzIGZhLWVkaXRcXFwiPjwvaT48L2J1dHRvbj5cXG4gICAgXFxuICAgIDwvZGl2PlxcblxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcImNvbnRlbnRcXFwiPlxcbiAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMudHJlZVxcXCIgXFxuICAgIGJuLWRhdGE9XFxcIntzb3VyY2UsIG9wdGlvbnN9XFxcIlxcbiAgICBibi1ldmVudD1cXFwidHJlZWFjdGl2YXRlOiBvbkl0ZW1TZWxlY3RlZFxcXCJcXG4gICAgYm4taWZhY2U9XFxcInRyZWVcXFwiXFxuICAgID48L2Rpdj5cXG5cXG48L2Rpdj5cXG5cXG5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnBhZ2VyJywgJ2JyZWl6Ym90Lmh0dHAnXSxcblxuXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHBhZ2VyLCBodHRwKSB7XG5cblx0XHRhc3luYyBmdW5jdGlvbiBnZXRGYXZvcml0ZXMoKSB7XG5cdFx0XHRjb25zdCByZXN1bHRzID0gYXdhaXQgaHR0cC5wb3N0KCcvZ2V0RmF2b3JpdGVzJylcblx0XHRcdGNvbnNvbGUubG9nKCdyZXN1bHRzJywgcmVzdWx0cylcblx0XHRcdGN0cmwuc2V0RGF0YSh7c291cmNlOiBbcmVzdWx0c10sIHNlbE5vZGU6bnVsbH0pXG5cdFx0XHRjdHJsLnNjb3BlLnRyZWUuZ2V0Um9vdE5vZGUoKS5nZXRGaXJzdENoaWxkKCkuc2V0RXhwYW5kZWQodHJ1ZSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBhZGRGYXZvcml0ZShwYXJlbnRJZCwgaW5mbykge1xuXHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2FkZEZhdm9yaXRlJywgeyBwYXJlbnRJZCwgaW5mbyB9KVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHJlbW92ZUZhdm9yaXRlKGlkKSB7XG5cdFx0XHRyZXR1cm4gaHR0cC5kZWxldGUoJy9yZW1vdmVGYXZvcml0ZS8nICsgaWQpXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gY2hhbmdlUGFyZW50KGlkLCBuZXdQYXJlbnRJZCkge1xuXHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2NoYW5nZVBhcmVudCcsIHtpZCwgbmV3UGFyZW50SWR9KVxuXHRcdH1cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0aXNFZGl0ZWQ6IGZhbHNlLFxuXHRcdFx0XHRzZWxOb2RlOiBudWxsLFxuXHRcdFx0XHRpc1Zpc2libGU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5pc0VkaXRlZCA/ICd2aXNpYmxlJyA6ICdoaWRkZW4nXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGNhblJlbW92ZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnNlbE5vZGUgIT0gbnVsbCAmJiB0aGlzLnNlbE5vZGUua2V5ICE9IFwiMFwiXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGNhbkFkZDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnNlbE5vZGUgIT0gbnVsbCAmJiB0aGlzLnNlbE5vZGUuaXNGb2xkZXIoKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHQvL3NvdXJjZTogW3sgdGl0bGU6ICdIb21lJywgZm9sZGVyOiB0cnVlLCBsYXp5OiB0cnVlLCBrZXk6IFwiMFwiIH1dLFxuXHRcdFx0XHRzb3VyY2U6IFtdLFxuXHRcdFx0XHRvcHRpb25zOiB7XG5cdFx0XHRcdFx0ZG5kOiB7XG5cdFx0XHRcdFx0XHRhdXRvRXhwYW5kTVM6IDQwMCxcblx0XHRcdFx0XHRcdGRyYWdTdGFydDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2RyYWdTdGFydCcsIGN0cmwubW9kZWwuaXNFZGl0ZWQpXG5cdFx0XHRcdFx0XHRcdHJldHVybiBjdHJsLm1vZGVsLmlzRWRpdGVkXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0ZHJhZ0VudGVyOiBmdW5jdGlvbihub2RlLCBkYXRhKSB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2RyYWdFbnRlcicsIG5vZGUuaXNGb2xkZXIoKSlcblx0XHRcdFx0XHRcdFx0aWYgKCFub2RlLmlzRm9sZGVyKCkpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2Vcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRpZiAoIW5vZGUuaXNMb2FkZWQoKSkge1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBmYWxzZVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdHJldHVybiBbJ292ZXInXVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdGRyYWdEcm9wOiBmdW5jdGlvbihub2RlLCBkYXRhKSB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2RyYWdEcm9wJylcblx0XHRcdFx0XHRcdFx0ZGF0YS5vdGhlck5vZGUubW92ZVRvKG5vZGUsIGRhdGEuaGl0TW9kZSlcblx0XHRcdFx0XHRcdFx0bm9kZS5zZXRFeHBhbmRlZCh0cnVlKVxuXHRcdFx0XHRcdFx0XHRjaGFuZ2VQYXJlbnQoZGF0YS5vdGhlck5vZGUua2V5LCBub2RlLmtleSlcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHJlbmRlck5vZGU6IGZ1bmN0aW9uIChldnQsIGRhdGEpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHsgbm9kZSB9ID0gZGF0YVxuXHRcdFx0XHRcdFx0aWYgKG5vZGUuZGF0YS5pY29uKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0ICRzcGFuID0gJChub2RlLnNwYW4pXG5cdFx0XHRcdFx0XHRcdCRzcGFuLmNzcyh7XG5cdFx0XHRcdFx0XHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0XHRcdFx0XHRcdGFsaWduSXRlbXM6ICdjZW50ZXInXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdCRzcGFuLmZpbmQoXCI+IHNwYW4uZmFuY3l0cmVlLWljb25cIikuY3NzKHtcblx0XHRcdFx0XHRcdFx0XHRiYWNrZ3JvdW5kSW1hZ2U6IGB1cmwoJHtub2RlLmRhdGEuaWNvbn0pYCxcblx0XHRcdFx0XHRcdFx0XHRiYWNrZ3JvdW5kUG9zaXRpb246IFwiMCAwXCIsXG5cdFx0XHRcdFx0XHRcdFx0YmFja2dyb3VuZFNpemU6IFwiMTZweCAxNnB4XCJcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0bGF6eUxvYWQ6IGZ1bmN0aW9uIChldmVudCwgZGF0YSkge1xuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnbGF6eUxvYWQnKVxuXHRcdFx0XHRcdFx0Y29uc3QgcGFyZW50SWQgPSBkYXRhLm5vZGUua2V5XG5cblx0XHRcdFx0XHRcdGRhdGEucmVzdWx0ID0gZ2V0RmF2b3JpdGVzKHBhcmVudElkKS50aGVuKChyZXN1bHRzKSA9PiB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ3Jlc3VsdHMnLCByZXN1bHRzKVxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gcmVzdWx0cy5tYXAoKGkpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRjb25zdCB7IG5hbWUsIHR5cGUsIGxpbmssIGljb24gfSA9IGkuaW5mb1xuXHRcdFx0XHRcdFx0XHRcdGlmICh0eXBlID09ICdmb2xkZXInKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR0aXRsZTogbmFtZSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0Zm9sZGVyOiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRsYXp5OiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRrZXk6IGkuX2lkLFxuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRpdGxlOiBuYW1lLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRrZXk6IGkuX2lkLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRkYXRhOiB7IGxpbmssIGljb24gfVxuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblVwZGF0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Z2V0RmF2b3JpdGVzKClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25JdGVtU2VsZWN0ZWQ6IGZ1bmN0aW9uIChldiwgc2VsTm9kZSkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkl0ZW1TZWxlY3RlZCcsIHNlbE5vZGUudGl0bGUpXG5cdFx0XHRcdFx0Ly8gaWYgKHNlbE5vZGUuaXNGb2xkZXIoKSkge1xuXHRcdFx0XHRcdC8vIFx0c2VsTm9kZS5zZXRFeHBhbmRlZCghc2VsTm9kZS5pc0V4cGFuZGVkKCkpXG5cdFx0XHRcdFx0Ly8gfVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHNlbE5vZGUgfSlcblx0XHRcdFx0XHRpZiAoIWN0cmwubW9kZWwuaXNFZGl0ZWQpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHsgbGluayB9ID0gc2VsTm9kZS5kYXRhXG5cdFx0XHRcdFx0XHRpZiAobGluayAhPSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdFx0d2luZG93Lm9wZW4obGluaylcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHNlbE5vZGUuc2V0QWN0aXZlKGZhbHNlKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25FZGl0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgaXNFZGl0ZWQ6IHRydWUsIHNlbE5vZGU6IG51bGwgfSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25CYWNrOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y29uc3QgeyBzZWxOb2RlIH0gPSBjdHJsLm1vZGVsXG5cdFx0XHRcdFx0aWYgKHNlbE5vZGUgIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0c2VsTm9kZS5zZXRBY3RpdmUoZmFsc2UpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGlzRWRpdGVkOiBmYWxzZSwgc2VsTm9kZTogbnVsbCB9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkFkZEZvbGRlcjogYXN5bmMgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IHRpdGxlID0gYXdhaXQgJCQudWkuc2hvd1Byb21wdCh7IHRpdGxlOiAnQWRkIEZvbGRlcicsIGxhYmVsOiAnTmFtZTonIH0pXG5cdFx0XHRcdFx0aWYgKHRpdGxlICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHsgc2VsTm9kZSB9ID0gY3RybC5tb2RlbFxuXHRcdFx0XHRcdFx0Y29uc3QgcGFyZW50SWQgPSBzZWxOb2RlLmtleVxuXHRcdFx0XHRcdFx0Y29uc3QgcmV0ID0gYXdhaXQgYWRkRmF2b3JpdGUocGFyZW50SWQsIHsgdHlwZTogJ2ZvbGRlcicsIG5hbWU6IHRpdGxlIH0pXG5cdFx0XHRcdFx0XHRzZWxOb2RlLmFkZE5vZGUoeyB0aXRsZSwgZm9sZGVyOiB0cnVlLCBsYXp5OiB0cnVlLCBrZXk6IHJldC5pZCB9KVxuXHRcdFx0XHRcdFx0c2VsTm9kZS5zZXRFeHBhbmRlZCh0cnVlKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25BZGRMaW5rOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2FkZExpbmsnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ0FkZCBMaW5rJyxcblx0XHRcdFx0XHRcdG9uUmV0dXJuOiBhc3luYyBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblJldHVybicsIGRhdGEpXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHsgbmFtZSwgbGluayB9ID0gZGF0YVxuXHRcdFx0XHRcdFx0XHRjb25zdCB7IHNlbE5vZGUgfSA9IGN0cmwubW9kZWxcblxuXHRcdFx0XHRcdFx0XHRjb25zdCBwYXJlbnRJZCA9IHNlbE5vZGUua2V5XG5cdFx0XHRcdFx0XHRcdGNvbnN0IHJldCA9IGF3YWl0IGFkZEZhdm9yaXRlKHBhcmVudElkLCB7IHR5cGU6ICdsaW5rJywgbmFtZSwgbGluayB9KVxuXG5cdFx0XHRcdFx0XHRcdHNlbE5vZGUuYWRkTm9kZSh7IHRpdGxlOiBuYW1lLCBrZXk6IHJldC5pZCwgZGF0YTogeyBsaW5rLCBpY29uOiByZXQuaW5mby5pY29uIH0gfSlcblx0XHRcdFx0XHRcdFx0c2VsTm9kZS5zZXRFeHBhbmRlZCh0cnVlKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvblJlbW92ZTogYXN5bmMgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IHsgc2VsTm9kZSB9ID0gY3RybC5tb2RlbFxuXHRcdFx0XHRcdGF3YWl0IHJlbW92ZUZhdm9yaXRlKHNlbE5vZGUua2V5KVxuXHRcdFx0XHRcdHNlbE5vZGUucmVtb3ZlKClcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBzZWxOb2RlOiBudWxsIH0pXG5cblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGdldEZhdm9yaXRlcygpXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iXX0=
