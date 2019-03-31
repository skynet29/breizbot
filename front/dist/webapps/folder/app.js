$$.control.registerControl('imagePage', {

	deps: ['breizbot.files'],

	template: "<div style=\"overflow: auto; height: 100%; text-align: center;\">\n	<img bn-attr=\"{src: url}\">	\n</div>\n",

	props: {
		$pager: null,
		url: null,
		fileName: ''
	},

	init: function(elt, files) {

		const {url, $pager, fileName} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				url
			}
		})
		this.onAction = function(action) {
			$$.ui.showConfirm({title: 'Remove file', content: 'Are you sure ?'}, function() {
				files.removeFiles([fileName])
				.then(function(resp) {
					console.log('resp', resp)
					$pager.popPage('reload')
				})
				.catch(function(resp) {
					console.log('resp', resp)
					$$.ui.showAlert({
						content: resp.responseText,
						title: 'Error'
					})
				})
			})
		}

	}
});





$$.control.registerControl('rootPage', {

	deps: ['breizbot.files'],

	template: "<div bn-control=\"breizbot.files\" \n	style=\"height: 100%\"\n	bn-event=\"fileclick: onFileClick\"\n	bn-iface=\"files\"\n	></div>",

	props: {
		$pager: null
	},

	init: function(elt, srvFiles) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onFileClick: function(ev, data) {
					//console.log('onFileClick', data)
					const {fileName, rootDir} = data
					if ($$.util.isImage(fileName)) {
						const url = srvFiles.fileUrl(rootDir + fileName)
						$pager.pushPage('imagePage', {
							title: fileName,
							props: {url, fileName: rootDir + fileName},
							buttons: [{name: 'del', label: 'Delete'}]
						})
					}

				}
			}
		})
		this.onReturn = function(data) {
			console.log('onReturn', data)
			if (data === 'reload') {
				ctrl.scope.files.update()
			}
		}
	}
});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImltYWdlLmpzIiwibWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2ltYWdlUGFnZScsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBzdHlsZT1cXFwib3ZlcmZsb3c6IGF1dG87IGhlaWdodDogMTAwJTsgdGV4dC1hbGlnbjogY2VudGVyO1xcXCI+XFxuXHQ8aW1nIGJuLWF0dHI9XFxcIntzcmM6IHVybH1cXFwiPlx0XFxuPC9kaXY+XFxuXCIsXG5cblx0cHJvcHM6IHtcblx0XHQkcGFnZXI6IG51bGwsXG5cdFx0dXJsOiBudWxsLFxuXHRcdGZpbGVOYW1lOiAnJ1xuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgZmlsZXMpIHtcblxuXHRcdGNvbnN0IHt1cmwsICRwYWdlciwgZmlsZU5hbWV9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHR1cmxcblx0XHRcdH1cblx0XHR9KVxuXHRcdHRoaXMub25BY3Rpb24gPSBmdW5jdGlvbihhY3Rpb24pIHtcblx0XHRcdCQkLnVpLnNob3dDb25maXJtKHt0aXRsZTogJ1JlbW92ZSBmaWxlJywgY29udGVudDogJ0FyZSB5b3Ugc3VyZSA/J30sIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRmaWxlcy5yZW1vdmVGaWxlcyhbZmlsZU5hbWVdKVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdCRwYWdlci5wb3BQYWdlKCdyZWxvYWQnKVxuXHRcdFx0XHR9KVxuXHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0pXG5cdFx0XHR9KVxuXHRcdH1cblxuXHR9XG59KTtcblxuXG5cblxuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLWNvbnRyb2w9XFxcImJyZWl6Ym90LmZpbGVzXFxcIiBcXG5cdHN0eWxlPVxcXCJoZWlnaHQ6IDEwMCVcXFwiXFxuXHRibi1ldmVudD1cXFwiZmlsZWNsaWNrOiBvbkZpbGVDbGlja1xcXCJcXG5cdGJuLWlmYWNlPVxcXCJmaWxlc1xcXCJcXG5cdD48L2Rpdj5cIixcblxuXHRwcm9wczoge1xuXHRcdCRwYWdlcjogbnVsbFxuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgc3J2RmlsZXMpIHtcblxuXHRcdGNvbnN0IHskcGFnZXJ9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkZpbGVDbGljazogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkZpbGVDbGljaycsIGRhdGEpXG5cdFx0XHRcdFx0Y29uc3Qge2ZpbGVOYW1lLCByb290RGlyfSA9IGRhdGFcblx0XHRcdFx0XHRpZiAoJCQudXRpbC5pc0ltYWdlKGZpbGVOYW1lKSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgdXJsID0gc3J2RmlsZXMuZmlsZVVybChyb290RGlyICsgZmlsZU5hbWUpXG5cdFx0XHRcdFx0XHQkcGFnZXIucHVzaFBhZ2UoJ2ltYWdlUGFnZScsIHtcblx0XHRcdFx0XHRcdFx0dGl0bGU6IGZpbGVOYW1lLFxuXHRcdFx0XHRcdFx0XHRwcm9wczoge3VybCwgZmlsZU5hbWU6IHJvb3REaXIgKyBmaWxlTmFtZX0sXG5cdFx0XHRcdFx0XHRcdGJ1dHRvbnM6IFt7bmFtZTogJ2RlbCcsIGxhYmVsOiAnRGVsZXRlJ31dXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblx0XHR0aGlzLm9uUmV0dXJuID0gZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ29uUmV0dXJuJywgZGF0YSlcblx0XHRcdGlmIChkYXRhID09PSAncmVsb2FkJykge1xuXHRcdFx0XHRjdHJsLnNjb3BlLmZpbGVzLnVwZGF0ZSgpXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59KTtcblxuXG5cblxuIl19
