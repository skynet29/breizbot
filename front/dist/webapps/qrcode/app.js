$$.control.registerControl('rootPage', {

	template: "<div\n	bn-control=\"brainjs.slider\",\n	data-orientation=\'vertical\',\n	class=\"slider\"\n	bn-show=\"hasZoom\"\n	bn-event=\"slidechange: onZoomChange\"\n	bn-iface=\"slider\"\n></div>\n\n<div class=\"main w3-pale-blue\">\n	<div bn-show=\"showMessage\">Sorry, no video device found !</div>\n	<div \n		bn-control=\"brainjs.camera\" \n		bn-event=\"cameraready: onCameraReady, barcode: onBarcode\"\n		bn-data=\"{\n			constraints: {\n				video: {\n					facingMode: \'environment\'\n				}\n			}\n		}\"\n		bn-iface=\"camera\">\n			\n		</div>	\n	\n</div>\n",


	init: function (elt) {

		const ctrl = $$.viewController(elt, {
			data: {
				showMessage: false,
				hasZoom: false
			},
			events: {
				onBarcode: function (ev, barcode) {
					console.log('onBarcode', barcode)
					const iface = $(this).iface()
					const { format, rawValue } = barcode
					let content = null
					if (format == 'qr_code') {
						content = {
							link: `<a href="${rawValue}" target="_blank">${rawValue}</a>`
						}
					}
					else {
						content = {
							format,
							value: rawValue
						}
					}
					$$.ui.showAlert({ title: 'BarCode Detected', content }, () => {
						iface.startBarcodeDetection()
					})
				},
				onCameraReady: async function (ev) {
					console.log('onCameraReady')
					const iface = $(this).iface()
					const capabilities = await iface.getCapabilities()
					console.log('capabilities', capabilities)

					if (capabilities.zoom) {
						const settings = iface.getSettings()
						//console.log('settings', settings)
						const { min, max, step } = capabilities.zoom
						ctrl.scope.slider.setData({ min, max, step })
						ctrl.scope.slider.setValue(settings.zoom)
						ctrl.setData({ hasZoom: true })
					}

					iface.startBarcodeDetection()

				},
				onZoomChange: function (ev) {
					const value = $(this).getValue()
					console.log('onZoomChange', value)
					ctrl.scope.camera.setZoom(value)
				}
			}
		})

		$$.util.getVideoDevices().then((videoDevices) => {
			if (videoDevices.length > 0) {
				ctrl.scope.camera.start()
			}
			else {
				ctrl.setData({ showMessage: true })
			}
		})



	}


});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXZcXG5cdGJuLWNvbnRyb2w9XFxcImJyYWluanMuc2xpZGVyXFxcIixcXG5cdGRhdGEtb3JpZW50YXRpb249XFwndmVydGljYWxcXCcsXFxuXHRjbGFzcz1cXFwic2xpZGVyXFxcIlxcblx0Ym4tc2hvdz1cXFwiaGFzWm9vbVxcXCJcXG5cdGJuLWV2ZW50PVxcXCJzbGlkZWNoYW5nZTogb25ab29tQ2hhbmdlXFxcIlxcblx0Ym4taWZhY2U9XFxcInNsaWRlclxcXCJcXG4+PC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwibWFpbiB3My1wYWxlLWJsdWVcXFwiPlxcblx0PGRpdiBibi1zaG93PVxcXCJzaG93TWVzc2FnZVxcXCI+U29ycnksIG5vIHZpZGVvIGRldmljZSBmb3VuZCAhPC9kaXY+XFxuXHQ8ZGl2IFxcblx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmNhbWVyYVxcXCIgXFxuXHRcdGJuLWV2ZW50PVxcXCJjYW1lcmFyZWFkeTogb25DYW1lcmFSZWFkeSwgYmFyY29kZTogb25CYXJjb2RlXFxcIlxcblx0XHRibi1kYXRhPVxcXCJ7XFxuXHRcdFx0Y29uc3RyYWludHM6IHtcXG5cdFx0XHRcdHZpZGVvOiB7XFxuXHRcdFx0XHRcdGZhY2luZ01vZGU6IFxcJ2Vudmlyb25tZW50XFwnXFxuXHRcdFx0XHR9XFxuXHRcdFx0fVxcblx0XHR9XFxcIlxcblx0XHRibi1pZmFjZT1cXFwiY2FtZXJhXFxcIj5cXG5cdFx0XHRcXG5cdFx0PC9kaXY+XHRcXG5cdFxcbjwvZGl2PlxcblwiLFxuXG5cblx0aW5pdDogZnVuY3Rpb24gKGVsdCkge1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRzaG93TWVzc2FnZTogZmFsc2UsXG5cdFx0XHRcdGhhc1pvb206IGZhbHNlXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQmFyY29kZTogZnVuY3Rpb24gKGV2LCBiYXJjb2RlKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQmFyY29kZScsIGJhcmNvZGUpXG5cdFx0XHRcdFx0Y29uc3QgaWZhY2UgPSAkKHRoaXMpLmlmYWNlKClcblx0XHRcdFx0XHRjb25zdCB7IGZvcm1hdCwgcmF3VmFsdWUgfSA9IGJhcmNvZGVcblx0XHRcdFx0XHRsZXQgY29udGVudCA9IG51bGxcblx0XHRcdFx0XHRpZiAoZm9ybWF0ID09ICdxcl9jb2RlJykge1xuXHRcdFx0XHRcdFx0Y29udGVudCA9IHtcblx0XHRcdFx0XHRcdFx0bGluazogYDxhIGhyZWY9XCIke3Jhd1ZhbHVlfVwiIHRhcmdldD1cIl9ibGFua1wiPiR7cmF3VmFsdWV9PC9hPmBcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRjb250ZW50ID0ge1xuXHRcdFx0XHRcdFx0XHRmb3JtYXQsXG5cdFx0XHRcdFx0XHRcdHZhbHVlOiByYXdWYWx1ZVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoeyB0aXRsZTogJ0JhckNvZGUgRGV0ZWN0ZWQnLCBjb250ZW50IH0sICgpID0+IHtcblx0XHRcdFx0XHRcdGlmYWNlLnN0YXJ0QmFyY29kZURldGVjdGlvbigpXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25DYW1lcmFSZWFkeTogYXN5bmMgZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ2FtZXJhUmVhZHknKVxuXHRcdFx0XHRcdGNvbnN0IGlmYWNlID0gJCh0aGlzKS5pZmFjZSgpXG5cdFx0XHRcdFx0Y29uc3QgY2FwYWJpbGl0aWVzID0gYXdhaXQgaWZhY2UuZ2V0Q2FwYWJpbGl0aWVzKClcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnY2FwYWJpbGl0aWVzJywgY2FwYWJpbGl0aWVzKVxuXG5cdFx0XHRcdFx0aWYgKGNhcGFiaWxpdGllcy56b29tKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBzZXR0aW5ncyA9IGlmYWNlLmdldFNldHRpbmdzKClcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ3NldHRpbmdzJywgc2V0dGluZ3MpXG5cdFx0XHRcdFx0XHRjb25zdCB7IG1pbiwgbWF4LCBzdGVwIH0gPSBjYXBhYmlsaXRpZXMuem9vbVxuXHRcdFx0XHRcdFx0Y3RybC5zY29wZS5zbGlkZXIuc2V0RGF0YSh7IG1pbiwgbWF4LCBzdGVwIH0pXG5cdFx0XHRcdFx0XHRjdHJsLnNjb3BlLnNsaWRlci5zZXRWYWx1ZShzZXR0aW5ncy56b29tKVxuXHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgaGFzWm9vbTogdHJ1ZSB9KVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmYWNlLnN0YXJ0QmFyY29kZURldGVjdGlvbigpXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25ab29tQ2hhbmdlOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRjb25zdCB2YWx1ZSA9ICQodGhpcykuZ2V0VmFsdWUoKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblpvb21DaGFuZ2UnLCB2YWx1ZSlcblx0XHRcdFx0XHRjdHJsLnNjb3BlLmNhbWVyYS5zZXRab29tKHZhbHVlKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdCQkLnV0aWwuZ2V0VmlkZW9EZXZpY2VzKCkudGhlbigodmlkZW9EZXZpY2VzKSA9PiB7XG5cdFx0XHRpZiAodmlkZW9EZXZpY2VzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0Y3RybC5zY29wZS5jYW1lcmEuc3RhcnQoKVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHNob3dNZXNzYWdlOiB0cnVlIH0pXG5cdFx0XHR9XG5cdFx0fSlcblxuXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iXX0=
