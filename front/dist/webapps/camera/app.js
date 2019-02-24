$$.control.registerControl('breizbot.main', {

	deps: ['breizbot.files'],

	template: "<div>\n	<button title=\"Take picture\" \n	bn-event=\"click: onTakePicture\" class=\"w3-btn w3-blue\"><i class=\"fa fa-camera\"></i></button>	\n</div>\n<div bn-control=\"brainjs.camera\" bn-iface=\"camera\"></div>	\n",

	init: function(elt, srvFiles) {

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onTakePicture: function(ev) {
					const url = ctrl.scope.camera.takePicture()
					const content = `<img src="${url}" width="400">`
					$$.ui.showConfirm({
						okText: 'Save',
						cancelText: 'Close',
						content, 
						width: 'auto', 
						title: 'Picture',
						position: { my: 'left top', at: 'left top', of: $('.breizbot-main') }
					}, function() {
						const fileName = 'SNAP' + Date.now() + '.png'
						console.log('fileName', fileName)

						srvFiles.uploadFile(url, fileName, '/images/camera').then(function(resp) {
							console.log('resp', resp)
						})	
						.catch(function(resp) {
							$$.ui.showAlert({
								title: 'Error',
								content: resp.responseText
							})
						})
					})					
				}
			}
		})

		ctrl.scope.camera.start()
	}
});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5tYWluJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2Plxcblx0PGJ1dHRvbiB0aXRsZT1cXFwiVGFrZSBwaWN0dXJlXFxcIiBcXG5cdGJuLWV2ZW50PVxcXCJjbGljazogb25UYWtlUGljdHVyZVxcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtY2FtZXJhXFxcIj48L2k+PC9idXR0b24+XHRcXG48L2Rpdj5cXG48ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY2FtZXJhXFxcIiBibi1pZmFjZT1cXFwiY2FtZXJhXFxcIj48L2Rpdj5cdFxcblwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgc3J2RmlsZXMpIHtcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25UYWtlUGljdHVyZTogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCB1cmwgPSBjdHJsLnNjb3BlLmNhbWVyYS50YWtlUGljdHVyZSgpXG5cdFx0XHRcdFx0Y29uc3QgY29udGVudCA9IGA8aW1nIHNyYz1cIiR7dXJsfVwiIHdpZHRoPVwiNDAwXCI+YFxuXHRcdFx0XHRcdCQkLnVpLnNob3dDb25maXJtKHtcblx0XHRcdFx0XHRcdG9rVGV4dDogJ1NhdmUnLFxuXHRcdFx0XHRcdFx0Y2FuY2VsVGV4dDogJ0Nsb3NlJyxcblx0XHRcdFx0XHRcdGNvbnRlbnQsIFxuXHRcdFx0XHRcdFx0d2lkdGg6ICdhdXRvJywgXG5cdFx0XHRcdFx0XHR0aXRsZTogJ1BpY3R1cmUnLFxuXHRcdFx0XHRcdFx0cG9zaXRpb246IHsgbXk6ICdsZWZ0IHRvcCcsIGF0OiAnbGVmdCB0b3AnLCBvZjogJCgnLmJyZWl6Ym90LW1haW4nKSB9XG5cdFx0XHRcdFx0fSwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBmaWxlTmFtZSA9ICdTTkFQJyArIERhdGUubm93KCkgKyAnLnBuZydcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdmaWxlTmFtZScsIGZpbGVOYW1lKVxuXG5cdFx0XHRcdFx0XHRzcnZGaWxlcy51cGxvYWRGaWxlKHVybCwgZmlsZU5hbWUsICcvaW1hZ2VzL2NhbWVyYScpLnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHR9KVx0XG5cdFx0XHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InLFxuXHRcdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0XG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH0pXHRcdFx0XHRcdFxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGN0cmwuc2NvcGUuY2FtZXJhLnN0YXJ0KClcblx0fVxufSk7XG5cblxuXG5cbiJdfQ==
