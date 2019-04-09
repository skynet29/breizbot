$$.control.registerControl('rootPage', {

	template: "<div class=\"toolbar\">\n	<div bn-control=\"brainjs.controlgroup\">\n		<button title=\"New File\" bn-event=\"click: onNewFile\">\n			<i class=\"fa fa-file\"></i></button>\n		<button title=\"Save File\" bn-event=\"click: onSaveFile\">\n			<i class=\"fa fa-save\"></i></button>\n		<button title=\"Open File\" bn-event=\"click: onOpenFile\">\n			<i class=\"fa fa-folder-open\"></i></button>\n	</div>\n</div>\n<div bn-control=\"brainjs.htmleditor\" bn-iface=\"editor\"></div>",

	deps: ['breizbot.files'],

	props: {
		$pager: null
	},

	init: function(elt, files) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onNewFile: function(ev) {
					console.log('onNewFile')
					ctrl.scope.editor.html('')
				},				
				onSaveFile: function(ev) {
					console.log('onSaveFile')
					$$.ui.showPrompt({title: 'Save File', content: "FileName:"}, function(fileName) {
						const htmlString = ctrl.scope.editor.html()
						const blob = new Blob([htmlString], {type: 'text/html'})
						files.uploadFile(blob, fileName + '.doc', '/documents').then(function(resp) {
							console.log('resp', resp)
						})	
						.catch(function(resp) {
							$$.ui.showAlert({
								title: 'Error',
								content: resp.responseText
							})
						})			
					})
				},
				onOpenFile: function(ev) {
					console.log('onOpenFile')
					$pager.pushPage('openFile', {
						title: 'Open File'
					})
				}
			}
		})

		this.onReturn = function(fileName) {
			console.log('onReturn', fileName)
			ctrl.scope.editor.load(files.fileUrl(fileName))
		}


	}
});





$$.control.registerControl('openFile', {

	template: "<div bn-control=\"breizbot.files\" \n	bn-event=\"fileclick: onFileClick\"\n	data-show-toolbar=\"false\"\n	data-filter-extension=\".doc\"\n	></div>",

	props: {
		$pager: null
	},

	init: function(elt) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onFileClick: function(ev, data) {
					console.log('onFileClick', data)
					const {fileName, rootDir} = data
					$pager.popPage(rootDir + fileName)
				}
			}
		})
	}
});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJvcGVuRmlsZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250cm9sZ3JvdXBcXFwiPlxcblx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJOZXcgRmlsZVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbk5ld0ZpbGVcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1maWxlXFxcIj48L2k+PC9idXR0b24+XFxuXHRcdDxidXR0b24gdGl0bGU9XFxcIlNhdmUgRmlsZVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblNhdmVGaWxlXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtc2F2ZVxcXCI+PC9pPjwvYnV0dG9uPlxcblx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJPcGVuIEZpbGVcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25PcGVuRmlsZVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWZvbGRlci1vcGVuXFxcIj48L2k+PC9idXR0b24+XFxuXHQ8L2Rpdj5cXG48L2Rpdj5cXG48ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaHRtbGVkaXRvclxcXCIgYm4taWZhY2U9XFxcImVkaXRvclxcXCI+PC9kaXY+XCIsXG5cblx0ZGVwczogWydicmVpemJvdC5maWxlcyddLFxuXG5cdHByb3BzOiB7XG5cdFx0JHBhZ2VyOiBudWxsXG5cdH0sXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBmaWxlcykge1xuXG5cdFx0Y29uc3QgeyRwYWdlcn0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uTmV3RmlsZTogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25OZXdGaWxlJylcblx0XHRcdFx0XHRjdHJsLnNjb3BlLmVkaXRvci5odG1sKCcnKVxuXHRcdFx0XHR9LFx0XHRcdFx0XG5cdFx0XHRcdG9uU2F2ZUZpbGU6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uU2F2ZUZpbGUnKVxuXHRcdFx0XHRcdCQkLnVpLnNob3dQcm9tcHQoe3RpdGxlOiAnU2F2ZSBGaWxlJywgY29udGVudDogXCJGaWxlTmFtZTpcIn0sIGZ1bmN0aW9uKGZpbGVOYW1lKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBodG1sU3RyaW5nID0gY3RybC5zY29wZS5lZGl0b3IuaHRtbCgpXG5cdFx0XHRcdFx0XHRjb25zdCBibG9iID0gbmV3IEJsb2IoW2h0bWxTdHJpbmddLCB7dHlwZTogJ3RleHQvaHRtbCd9KVxuXHRcdFx0XHRcdFx0ZmlsZXMudXBsb2FkRmlsZShibG9iLCBmaWxlTmFtZSArICcuZG9jJywgJy9kb2N1bWVudHMnKS50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0fSlcdFxuXHRcdFx0XHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJyxcblx0XHRcdFx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dFxuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0fSlcdFx0XHRcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbk9wZW5GaWxlOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbk9wZW5GaWxlJylcblx0XHRcdFx0XHQkcGFnZXIucHVzaFBhZ2UoJ29wZW5GaWxlJywge1xuXHRcdFx0XHRcdFx0dGl0bGU6ICdPcGVuIEZpbGUnXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHR0aGlzLm9uUmV0dXJuID0gZnVuY3Rpb24oZmlsZU5hbWUpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdvblJldHVybicsIGZpbGVOYW1lKVxuXHRcdFx0Y3RybC5zY29wZS5lZGl0b3IubG9hZChmaWxlcy5maWxlVXJsKGZpbGVOYW1lKSlcblx0XHR9XG5cblxuXHR9XG59KTtcblxuXG5cblxuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ29wZW5GaWxlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgYm4tY29udHJvbD1cXFwiYnJlaXpib3QuZmlsZXNcXFwiIFxcblx0Ym4tZXZlbnQ9XFxcImZpbGVjbGljazogb25GaWxlQ2xpY2tcXFwiXFxuXHRkYXRhLXNob3ctdG9vbGJhcj1cXFwiZmFsc2VcXFwiXFxuXHRkYXRhLWZpbHRlci1leHRlbnNpb249XFxcIi5kb2NcXFwiXFxuXHQ+PC9kaXY+XCIsXG5cblx0cHJvcHM6IHtcblx0XHQkcGFnZXI6IG51bGxcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQpIHtcblxuXHRcdGNvbnN0IHskcGFnZXJ9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkZpbGVDbGljazogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25GaWxlQ2xpY2snLCBkYXRhKVxuXHRcdFx0XHRcdGNvbnN0IHtmaWxlTmFtZSwgcm9vdERpcn0gPSBkYXRhXG5cdFx0XHRcdFx0JHBhZ2VyLnBvcFBhZ2Uocm9vdERpciArIGZpbGVOYW1lKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblx0fVxufSk7XG5cblxuXG5cbiJdfQ==
