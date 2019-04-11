$$.control.registerControl('rootPage', {

	template: "<div class=\"titlebar\"><strong bn-text=\"fileName\"></strong></div>\n<div class=\"toolbar\">\n	<div bn-control=\"brainjs.controlgroup\">\n		<button title=\"New File\" bn-event=\"click: onNewFile\">\n			<i class=\"fa fa-file\"></i></button>\n		<button title=\"Save File\" bn-event=\"click: onSaveFile\">\n			<i class=\"fa fa-save\"></i></button>\n		<button title=\"Open File\" bn-event=\"click: onOpenFile\">\n			<i class=\"fa fa-folder-open\"></i></button>\n	</div>\n	<div bn-control=\"brainjs.controlgroup\">\n		<button title=\"Insert image\" bn-event=\"click: onInsertImage\">\n			<i class=\"fa fa-image\"></i></button>\n	</div>\n</div>\n<div bn-control=\"brainjs.htmleditor\" bn-iface=\"editor\"></div>",

	deps: ['breizbot.files'],

	props: {
		$pager: null
	},

	init: function(elt, files) {

		const {$pager} = this.props
		let range

		const ctrl = $$.viewController(elt, {
			data: {
				fileName: '',
				rootDir: ''
			},
			events: {
				onNewFile: function(ev) {
					console.log('onNewFile')
					ctrl.scope.editor.html('')
					ctrl.setData({fileName: ''})
				},				
				onSaveFile: function(ev) {
					console.log('onSaveFile')
					if (ctrl.model.fileName != '') {
						saveFile()
						return
					}
					$$.ui.showPrompt({title: 'Save File', content: "FileName:"}, function(fileName) {
						fileName += '.doc'
						ctrl.setData({fileName, rootDir: '/documents'})
						saveFile()
					})
				},
				onOpenFile: function(ev) {
					console.log('onOpenFile')
					$pager.pushPage('openFile', {
						title: 'Open File',
						props: {
							filterExtension: '.doc',
							cmd: 'openFile'
						}
					})
				},
				onInsertImage: function(ev) {
					console.log('onInsertImage')

					$pager.pushPage('openFile', {
						title: 'Insert Image',
						props: {
							imageOnly: true,
							cmd: 'insertImage'
						}
					})					
				}
			}
		})

		function saveFile() {
			const {fileName, rootDir} = ctrl.model
			const htmlString = ctrl.scope.editor.html()
			const blob = new Blob([htmlString], {type: 'text/html'})
			files.uploadFile(blob, fileName, rootDir).then(function(resp) {
				console.log('resp', resp)
			})	
			.catch(function(resp) {
				$$.ui.showAlert({
					title: 'Error',
					content: resp.responseText
				})
			})	
		}

		this.onReturn = function(data) {
			console.log('onReturn', data)
			const {fileName, rootDir, cmd} = data
			if (cmd == 'openFile') {
				ctrl.setData({fileName, rootDir})

				ctrl.scope.editor.load(files.fileUrl(rootDir + fileName))

			}
			if (cmd == 'insertImage') {

				ctrl.scope.editor.insertImage(files.fileUrl(rootDir + fileName))
			}
		}


	}
});





$$.control.registerControl('openFile', {

	template: "<div bn-control=\"breizbot.files\" \n	bn-event=\"fileclick: onFileClick\"\n	data-show-toolbar=\"false\"\n	bn-data=\"{imageOnly, filterExtension}\"\n	></div>",

	props: {
		$pager: null,
		imageOnly: false,
		filterExtension: '',
		cmd: ''
	},

	init: function(elt) {

		const {$pager, imageOnly, filterExtension, cmd} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				imageOnly,
				filterExtension
			},
			events: {
				onFileClick: function(ev, data) {
					data.cmd = cmd
					console.log('onFileClick', data)
					$pager.popPage(data)
				}
			}
		})
	}
});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJvcGVuRmlsZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJ0aXRsZWJhclxcXCI+PHN0cm9uZyBibi10ZXh0PVxcXCJmaWxlTmFtZVxcXCI+PC9zdHJvbmc+PC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udHJvbGdyb3VwXFxcIj5cXG5cdFx0PGJ1dHRvbiB0aXRsZT1cXFwiTmV3IEZpbGVcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25OZXdGaWxlXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtZmlsZVxcXCI+PC9pPjwvYnV0dG9uPlxcblx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJTYXZlIEZpbGVcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25TYXZlRmlsZVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXNhdmVcXFwiPjwvaT48L2J1dHRvbj5cXG5cdFx0PGJ1dHRvbiB0aXRsZT1cXFwiT3BlbiBGaWxlXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uT3BlbkZpbGVcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1mb2xkZXItb3BlblxcXCI+PC9pPjwvYnV0dG9uPlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udHJvbGdyb3VwXFxcIj5cXG5cdFx0PGJ1dHRvbiB0aXRsZT1cXFwiSW5zZXJ0IGltYWdlXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uSW5zZXJ0SW1hZ2VcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1pbWFnZVxcXCI+PC9pPjwvYnV0dG9uPlxcblx0PC9kaXY+XFxuPC9kaXY+XFxuPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmh0bWxlZGl0b3JcXFwiIGJuLWlmYWNlPVxcXCJlZGl0b3JcXFwiPjwvZGl2PlwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnXSxcblxuXHRwcm9wczoge1xuXHRcdCRwYWdlcjogbnVsbFxuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgZmlsZXMpIHtcblxuXHRcdGNvbnN0IHskcGFnZXJ9ID0gdGhpcy5wcm9wc1xuXHRcdGxldCByYW5nZVxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRmaWxlTmFtZTogJycsXG5cdFx0XHRcdHJvb3REaXI6ICcnXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uTmV3RmlsZTogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25OZXdGaWxlJylcblx0XHRcdFx0XHRjdHJsLnNjb3BlLmVkaXRvci5odG1sKCcnKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7ZmlsZU5hbWU6ICcnfSlcblx0XHRcdFx0fSxcdFx0XHRcdFxuXHRcdFx0XHRvblNhdmVGaWxlOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblNhdmVGaWxlJylcblx0XHRcdFx0XHRpZiAoY3RybC5tb2RlbC5maWxlTmFtZSAhPSAnJykge1xuXHRcdFx0XHRcdFx0c2F2ZUZpbGUoKVxuXHRcdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdCQkLnVpLnNob3dQcm9tcHQoe3RpdGxlOiAnU2F2ZSBGaWxlJywgY29udGVudDogXCJGaWxlTmFtZTpcIn0sIGZ1bmN0aW9uKGZpbGVOYW1lKSB7XG5cdFx0XHRcdFx0XHRmaWxlTmFtZSArPSAnLmRvYydcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7ZmlsZU5hbWUsIHJvb3REaXI6ICcvZG9jdW1lbnRzJ30pXG5cdFx0XHRcdFx0XHRzYXZlRmlsZSgpXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25PcGVuRmlsZTogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25PcGVuRmlsZScpXG5cdFx0XHRcdFx0JHBhZ2VyLnB1c2hQYWdlKCdvcGVuRmlsZScsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnT3BlbiBGaWxlJyxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdGZpbHRlckV4dGVuc2lvbjogJy5kb2MnLFxuXHRcdFx0XHRcdFx0XHRjbWQ6ICdvcGVuRmlsZSdcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkluc2VydEltYWdlOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkluc2VydEltYWdlJylcblxuXHRcdFx0XHRcdCRwYWdlci5wdXNoUGFnZSgnb3BlbkZpbGUnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ0luc2VydCBJbWFnZScsXG5cdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRpbWFnZU9ubHk6IHRydWUsXG5cdFx0XHRcdFx0XHRcdGNtZDogJ2luc2VydEltYWdlJ1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXHRcdFx0XHRcdFxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGZ1bmN0aW9uIHNhdmVGaWxlKCkge1xuXHRcdFx0Y29uc3Qge2ZpbGVOYW1lLCByb290RGlyfSA9IGN0cmwubW9kZWxcblx0XHRcdGNvbnN0IGh0bWxTdHJpbmcgPSBjdHJsLnNjb3BlLmVkaXRvci5odG1sKClcblx0XHRcdGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbaHRtbFN0cmluZ10sIHt0eXBlOiAndGV4dC9odG1sJ30pXG5cdFx0XHRmaWxlcy51cGxvYWRGaWxlKGJsb2IsIGZpbGVOYW1lLCByb290RGlyKS50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0fSlcdFxuXHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJyxcblx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dFxuXHRcdFx0XHR9KVxuXHRcdFx0fSlcdFxuXHRcdH1cblxuXHRcdHRoaXMub25SZXR1cm4gPSBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnb25SZXR1cm4nLCBkYXRhKVxuXHRcdFx0Y29uc3Qge2ZpbGVOYW1lLCByb290RGlyLCBjbWR9ID0gZGF0YVxuXHRcdFx0aWYgKGNtZCA9PSAnb3BlbkZpbGUnKSB7XG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7ZmlsZU5hbWUsIHJvb3REaXJ9KVxuXG5cdFx0XHRcdGN0cmwuc2NvcGUuZWRpdG9yLmxvYWQoZmlsZXMuZmlsZVVybChyb290RGlyICsgZmlsZU5hbWUpKVxuXG5cdFx0XHR9XG5cdFx0XHRpZiAoY21kID09ICdpbnNlcnRJbWFnZScpIHtcblxuXHRcdFx0XHRjdHJsLnNjb3BlLmVkaXRvci5pbnNlcnRJbWFnZShmaWxlcy5maWxlVXJsKHJvb3REaXIgKyBmaWxlTmFtZSkpXG5cdFx0XHR9XG5cdFx0fVxuXG5cblx0fVxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdvcGVuRmlsZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLWNvbnRyb2w9XFxcImJyZWl6Ym90LmZpbGVzXFxcIiBcXG5cdGJuLWV2ZW50PVxcXCJmaWxlY2xpY2s6IG9uRmlsZUNsaWNrXFxcIlxcblx0ZGF0YS1zaG93LXRvb2xiYXI9XFxcImZhbHNlXFxcIlxcblx0Ym4tZGF0YT1cXFwie2ltYWdlT25seSwgZmlsdGVyRXh0ZW5zaW9ufVxcXCJcXG5cdD48L2Rpdj5cIixcblxuXHRwcm9wczoge1xuXHRcdCRwYWdlcjogbnVsbCxcblx0XHRpbWFnZU9ubHk6IGZhbHNlLFxuXHRcdGZpbHRlckV4dGVuc2lvbjogJycsXG5cdFx0Y21kOiAnJ1xuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXG5cdFx0Y29uc3QgeyRwYWdlciwgaW1hZ2VPbmx5LCBmaWx0ZXJFeHRlbnNpb24sIGNtZH0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGltYWdlT25seSxcblx0XHRcdFx0ZmlsdGVyRXh0ZW5zaW9uXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uRmlsZUNsaWNrOiBmdW5jdGlvbihldiwgZGF0YSkge1xuXHRcdFx0XHRcdGRhdGEuY21kID0gY21kXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uRmlsZUNsaWNrJywgZGF0YSlcblx0XHRcdFx0XHQkcGFnZXIucG9wUGFnZShkYXRhKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblx0fVxufSk7XG5cblxuXG5cbiJdfQ==
