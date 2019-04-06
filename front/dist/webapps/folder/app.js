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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImltYWdlLmpzIiwibWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnaW1hZ2VQYWdlJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IHN0eWxlPVxcXCJvdmVyZmxvdzogYXV0bzsgaGVpZ2h0OiAxMDAlOyB0ZXh0LWFsaWduOiBjZW50ZXI7XFxcIj5cXG5cdDxpbWcgYm4tYXR0cj1cXFwie3NyYzogdXJsfVxcXCI+XHRcXG48L2Rpdj5cXG5cIixcblxuXHRwcm9wczoge1xuXHRcdCRwYWdlcjogbnVsbCxcblx0XHRmaWxlTmFtZTogJydcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIGZpbGVzKSB7XG5cblx0XHRjb25zdCB7JHBhZ2VyLCBmaWxlTmFtZX0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHVybDogZmlsZXMuZmlsZVVybChmaWxlTmFtZSlcblx0XHRcdH1cblx0XHR9KVxuXHRcdHRoaXMub25BY3Rpb24gPSBmdW5jdGlvbihhY3Rpb24pIHtcblx0XHRcdCQkLnVpLnNob3dDb25maXJtKHt0aXRsZTogJ1JlbW92ZSBmaWxlJywgY29udGVudDogJ0FyZSB5b3Ugc3VyZSA/J30sIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRmaWxlcy5yZW1vdmVGaWxlcyhbZmlsZU5hbWVdKVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdCRwYWdlci5wb3BQYWdlKCdyZWxvYWQnKVxuXHRcdFx0XHR9KVxuXHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0pXG5cdFx0XHR9KVxuXHRcdH1cblxuXHR9XG59KTtcblxuXG5cblxuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLWNvbnRyb2w9XFxcImJyZWl6Ym90LmZpbGVzXFxcIiBcXG5cdHN0eWxlPVxcXCJoZWlnaHQ6IDEwMCVcXFwiXFxuXHRibi1ldmVudD1cXFwiZmlsZWNsaWNrOiBvbkZpbGVDbGlja1xcXCJcXG5cdGJuLWlmYWNlPVxcXCJmaWxlc1xcXCJcXG5cdD48L2Rpdj5cIixcblxuXHRwcm9wczoge1xuXHRcdCRwYWdlcjogbnVsbFxuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgc3J2RmlsZXMpIHtcblxuXHRcdGNvbnN0IHskcGFnZXJ9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkZpbGVDbGljazogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkZpbGVDbGljaycsIGRhdGEpXG5cdFx0XHRcdFx0Y29uc3Qge2ZpbGVOYW1lLCByb290RGlyfSA9IGRhdGFcblx0XHRcdFx0XHRpZiAoJCQudXRpbC5pc0ltYWdlKGZpbGVOYW1lKSkge1x0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0JHBhZ2VyLnB1c2hQYWdlKCdpbWFnZVBhZ2UnLCB7XG5cdFx0XHRcdFx0XHRcdHRpdGxlOiBmaWxlTmFtZSxcblx0XHRcdFx0XHRcdFx0cHJvcHM6IHtmaWxlTmFtZTogcm9vdERpciArIGZpbGVOYW1lfSxcblx0XHRcdFx0XHRcdFx0YnV0dG9uczogW3tuYW1lOiAnZGVsJywgbGFiZWw6ICdEZWxldGUnfV1cblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXHRcdHRoaXMub25SZXR1cm4gPSBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnb25SZXR1cm4nLCBkYXRhKVxuXHRcdFx0aWYgKGRhdGEgPT09ICdyZWxvYWQnKSB7XG5cdFx0XHRcdGN0cmwuc2NvcGUuZmlsZXMudXBkYXRlKClcblx0XHRcdH1cblx0XHR9XG5cdH1cbn0pO1xuXG5cblxuXG4iXX0=
