$$.control.registerControl('breizbot.main', {

	deps: ['breizbot.files'],

	template: "<div bn-control=\"breizbot.files\" \n	style=\"height: 100%\"\n	bn-event=\"fileclick: onFileClick\"\n	></div>",

	init: function(elt, srvFiles) {

		$$.viewController(elt, {
			data: {
			},
			events: {
				onFileClick: function(ev, data) {
					//console.log('onFileClick', data)
					const {fileName, rootDir} = data
					if ($$.util.isImage(fileName)) {
						const url = srvFiles.fileUrl(rootDir + fileName)
						$$.ui.showAlert({
							okText: 'Close',
							width: 'auto',
							title: fileName,
							content: `<img src="${url}" width="400">`
						})						
					}

				}
			}
		})
	}
});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QubWFpbicsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5maWxlc1xcXCIgXFxuXHRzdHlsZT1cXFwiaGVpZ2h0OiAxMDAlXFxcIlxcblx0Ym4tZXZlbnQ9XFxcImZpbGVjbGljazogb25GaWxlQ2xpY2tcXFwiXFxuXHQ+PC9kaXY+XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBzcnZGaWxlcykge1xuXG5cdFx0JCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uRmlsZUNsaWNrOiBmdW5jdGlvbihldiwgZGF0YSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uRmlsZUNsaWNrJywgZGF0YSlcblx0XHRcdFx0XHRjb25zdCB7ZmlsZU5hbWUsIHJvb3REaXJ9ID0gZGF0YVxuXHRcdFx0XHRcdGlmICgkJC51dGlsLmlzSW1hZ2UoZmlsZU5hbWUpKSB7XG5cdFx0XHRcdFx0XHRjb25zdCB1cmwgPSBzcnZGaWxlcy5maWxlVXJsKHJvb3REaXIgKyBmaWxlTmFtZSlcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdG9rVGV4dDogJ0Nsb3NlJyxcblx0XHRcdFx0XHRcdFx0d2lkdGg6ICdhdXRvJyxcblx0XHRcdFx0XHRcdFx0dGl0bGU6IGZpbGVOYW1lLFxuXHRcdFx0XHRcdFx0XHRjb250ZW50OiBgPGltZyBzcmM9XCIke3VybH1cIiB3aWR0aD1cIjQwMFwiPmBcblx0XHRcdFx0XHRcdH0pXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXHR9XG59KTtcblxuXG5cblxuIl19
