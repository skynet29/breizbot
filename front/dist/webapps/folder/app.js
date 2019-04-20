$$.control.registerControl('imagePage', {

	deps: ['breizbot.files'],

	template: "<div style=\"overflow: auto; height: 100%; text-align: center;\">\n	<img bn-attr=\"{src: url}\">	\n</div>\n",

	props: {
		$pager: null,
		fileName: ''
	},

	init: function(elt, files) {

		const {$pager, fileName} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				url: files.fileUrl(fileName)
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

	template: "<div bn-control=\"breizbot.files\" \n	style=\"height: 100%\"\n	bn-event=\"fileclick: onFileClick\"\n	bn-iface=\"files\"\n	data-show-thumbnail=\"true\"\n	></div>",

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
					console.log('onFileClick', data)
					const {fileName, rootDir, isImage} = data
					if (isImage) {						
						$pager.pushPage('imagePage', {
							title: fileName,
							props: {fileName: rootDir + fileName},
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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImltYWdlLmpzIiwibWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnaW1hZ2VQYWdlJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IHN0eWxlPVxcXCJvdmVyZmxvdzogYXV0bzsgaGVpZ2h0OiAxMDAlOyB0ZXh0LWFsaWduOiBjZW50ZXI7XFxcIj5cXG5cdDxpbWcgYm4tYXR0cj1cXFwie3NyYzogdXJsfVxcXCI+XHRcXG48L2Rpdj5cXG5cIixcblxuXHRwcm9wczoge1xuXHRcdCRwYWdlcjogbnVsbCxcblx0XHRmaWxlTmFtZTogJydcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIGZpbGVzKSB7XG5cblx0XHRjb25zdCB7JHBhZ2VyLCBmaWxlTmFtZX0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHVybDogZmlsZXMuZmlsZVVybChmaWxlTmFtZSlcblx0XHRcdH1cblx0XHR9KVxuXHRcdHRoaXMub25BY3Rpb24gPSBmdW5jdGlvbihhY3Rpb24pIHtcblx0XHRcdCQkLnVpLnNob3dDb25maXJtKHt0aXRsZTogJ1JlbW92ZSBmaWxlJywgY29udGVudDogJ0FyZSB5b3Ugc3VyZSA/J30sIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRmaWxlcy5yZW1vdmVGaWxlcyhbZmlsZU5hbWVdKVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdCRwYWdlci5wb3BQYWdlKCdyZWxvYWQnKVxuXHRcdFx0XHR9KVxuXHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0pXG5cdFx0XHR9KVxuXHRcdH1cblxuXHR9XG59KTtcblxuXG5cblxuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLWNvbnRyb2w9XFxcImJyZWl6Ym90LmZpbGVzXFxcIiBcXG5cdHN0eWxlPVxcXCJoZWlnaHQ6IDEwMCVcXFwiXFxuXHRibi1ldmVudD1cXFwiZmlsZWNsaWNrOiBvbkZpbGVDbGlja1xcXCJcXG5cdGJuLWlmYWNlPVxcXCJmaWxlc1xcXCJcXG5cdGRhdGEtc2hvdy10aHVtYm5haWw9XFxcInRydWVcXFwiXFxuXHQ+PC9kaXY+XCIsXG5cblx0cHJvcHM6IHtcblx0XHQkcGFnZXI6IG51bGxcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydkZpbGVzKSB7XG5cblx0XHRjb25zdCB7JHBhZ2VyfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25GaWxlQ2xpY2s6IGZ1bmN0aW9uKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uRmlsZUNsaWNrJywgZGF0YSlcblx0XHRcdFx0XHRjb25zdCB7ZmlsZU5hbWUsIHJvb3REaXIsIGlzSW1hZ2V9ID0gZGF0YVxuXHRcdFx0XHRcdGlmIChpc0ltYWdlKSB7XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHQkcGFnZXIucHVzaFBhZ2UoJ2ltYWdlUGFnZScsIHtcblx0XHRcdFx0XHRcdFx0dGl0bGU6IGZpbGVOYW1lLFxuXHRcdFx0XHRcdFx0XHRwcm9wczoge2ZpbGVOYW1lOiByb290RGlyICsgZmlsZU5hbWV9LFxuXHRcdFx0XHRcdFx0XHRidXR0b25zOiBbe25hbWU6ICdkZWwnLCBsYWJlbDogJ0RlbGV0ZSd9XVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cdFx0dGhpcy5vblJldHVybiA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdvblJldHVybicsIGRhdGEpXG5cdFx0XHRpZiAoZGF0YSA9PT0gJ3JlbG9hZCcpIHtcblx0XHRcdFx0Y3RybC5zY29wZS5maWxlcy51cGRhdGUoKVxuXHRcdFx0fVxuXHRcdH1cblx0fVxufSk7XG5cblxuXG5cbiJdfQ==
