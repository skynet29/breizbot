$$.control.registerControl('rootPage', {

	template: "<div bn-control=\"breizbot.files\" \n	style=\"height: 100%\"\n	bn-event=\"fileclick: onFileClick\"\n	bn-iface=\"files\"\n	data-show-toolbar=\"true\"\n	></div>",

	deps: ['breizbot.pager', 'breizbot.files'],


	init: function(elt, pager, srvFiles) {

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onFileClick: function(ev, data) {
					//console.log('onFileClick', data)
					const {fileName, rootDir} = data
					const fullName = rootDir + fileName

					const type = $$.util.getFileType(fileName)
					if (type != undefined) {
						pager.pushPage('breizbot.viewer', {
							title: fileName,
							props: {
								type,
								url: srvFiles.fileUrl(fullName)				
							}
						})
					}
													
				}
			}
		})

	}
});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgYm4tY29udHJvbD1cXFwiYnJlaXpib3QuZmlsZXNcXFwiIFxcblx0c3R5bGU9XFxcImhlaWdodDogMTAwJVxcXCJcXG5cdGJuLWV2ZW50PVxcXCJmaWxlY2xpY2s6IG9uRmlsZUNsaWNrXFxcIlxcblx0Ym4taWZhY2U9XFxcImZpbGVzXFxcIlxcblx0ZGF0YS1zaG93LXRvb2xiYXI9XFxcInRydWVcXFwiXFxuXHQ+PC9kaXY+XCIsXG5cblx0ZGVwczogWydicmVpemJvdC5wYWdlcicsICdicmVpemJvdC5maWxlcyddLFxuXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBwYWdlciwgc3J2RmlsZXMpIHtcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25GaWxlQ2xpY2s6IGZ1bmN0aW9uKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25GaWxlQ2xpY2snLCBkYXRhKVxuXHRcdFx0XHRcdGNvbnN0IHtmaWxlTmFtZSwgcm9vdERpcn0gPSBkYXRhXG5cdFx0XHRcdFx0Y29uc3QgZnVsbE5hbWUgPSByb290RGlyICsgZmlsZU5hbWVcblxuXHRcdFx0XHRcdGNvbnN0IHR5cGUgPSAkJC51dGlsLmdldEZpbGVUeXBlKGZpbGVOYW1lKVxuXHRcdFx0XHRcdGlmICh0eXBlICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LnZpZXdlcicsIHtcblx0XHRcdFx0XHRcdFx0dGl0bGU6IGZpbGVOYW1lLFxuXHRcdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRcdHR5cGUsXG5cdFx0XHRcdFx0XHRcdFx0dXJsOiBzcnZGaWxlcy5maWxlVXJsKGZ1bGxOYW1lKVx0XHRcdFx0XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0fVxufSk7XG5cblxuXG5cbiJdfQ==
