// @ts-check

$$.control.registerControl('rootPage', {

	template: "<div class=\"top\">\n    <div bn-control=\"breizbot.audioplayer\" bn-data=\"options\" bn-iface=\"audio1\"></div>\n    <div bn-control=\"breizbot.audioplayer\" bn-data=\"options\" bn-iface=\"audio2\"></div>\n</div>\n<div class=\"bottom\">\n    <div class=\"balance\">\n        <label>Left</label>\n        <div bn-control=\"brainjs.slider\" bn-data=\"{min: 0, max: 1, step: 0.01}\" bn-event=\"input: onSliderChange\"></div>\n        <label>Right</label>\n    </div>\n    \n</div>\n",

	deps: ['breizbot.pager'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, pager) {


		const ctrl = $$.viewController(elt, {
			data: {
				options : {filterExtension: 'mp3', getMP3Info: true, showMp3Filter: true}
			},
			events: {
				onSliderChange: function() {
					const val = $(this).getValue()
					//console.log('onSliderChange', val)
					gain1.gain.value = 1 - val
					gain2.gain.value = val
				}
			}
		})

		/**@type {HTMLAudioElement} */
		const audio1 = ctrl.scope.audio1.getAudioElement()

		/**@type {HTMLAudioElement} */
		const audio2 = ctrl.scope.audio2.getAudioElement()

		const audioCtx = new AudioContext()
		const source1 = audioCtx.createMediaElementSource(audio1)
		const source2 = audioCtx.createMediaElementSource(audio2)

		const gain1 = audioCtx.createGain()
		const gain2 = audioCtx.createGain()
		gain1.gain.value = 1
		gain2.gain.value = 0
		
		source1.connect(gain1)
		source2.connect(gain2)

		gain1.connect(audioCtx.destination)
		gain2.connect(audioCtx.destination)

	}


});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBAdHMtY2hlY2tcblxuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvcFxcXCI+XFxuICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJlaXpib3QuYXVkaW9wbGF5ZXJcXFwiIGJuLWRhdGE9XFxcIm9wdGlvbnNcXFwiIGJuLWlmYWNlPVxcXCJhdWRpbzFcXFwiPjwvZGl2PlxcbiAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyZWl6Ym90LmF1ZGlvcGxheWVyXFxcIiBibi1kYXRhPVxcXCJvcHRpb25zXFxcIiBibi1pZmFjZT1cXFwiYXVkaW8yXFxcIj48L2Rpdj5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJib3R0b21cXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJiYWxhbmNlXFxcIj5cXG4gICAgICAgIDxsYWJlbD5MZWZ0PC9sYWJlbD5cXG4gICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5zbGlkZXJcXFwiIGJuLWRhdGE9XFxcInttaW46IDAsIG1heDogMSwgc3RlcDogMC4wMX1cXFwiIGJuLWV2ZW50PVxcXCJpbnB1dDogb25TbGlkZXJDaGFuZ2VcXFwiPjwvZGl2PlxcbiAgICAgICAgPGxhYmVsPlJpZ2h0PC9sYWJlbD5cXG4gICAgPC9kaXY+XFxuICAgIFxcbjwvZGl2PlxcblwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5QYWdlci5JbnRlcmZhY2V9IHBhZ2VyIFxuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIpIHtcblxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRvcHRpb25zIDoge2ZpbHRlckV4dGVuc2lvbjogJ21wMycsIGdldE1QM0luZm86IHRydWUsIHNob3dNcDNGaWx0ZXI6IHRydWV9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uU2xpZGVyQ2hhbmdlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zdCB2YWwgPSAkKHRoaXMpLmdldFZhbHVlKClcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblNsaWRlckNoYW5nZScsIHZhbClcblx0XHRcdFx0XHRnYWluMS5nYWluLnZhbHVlID0gMSAtIHZhbFxuXHRcdFx0XHRcdGdhaW4yLmdhaW4udmFsdWUgPSB2YWxcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHQvKipAdHlwZSB7SFRNTEF1ZGlvRWxlbWVudH0gKi9cblx0XHRjb25zdCBhdWRpbzEgPSBjdHJsLnNjb3BlLmF1ZGlvMS5nZXRBdWRpb0VsZW1lbnQoKVxuXG5cdFx0LyoqQHR5cGUge0hUTUxBdWRpb0VsZW1lbnR9ICovXG5cdFx0Y29uc3QgYXVkaW8yID0gY3RybC5zY29wZS5hdWRpbzIuZ2V0QXVkaW9FbGVtZW50KClcblxuXHRcdGNvbnN0IGF1ZGlvQ3R4ID0gbmV3IEF1ZGlvQ29udGV4dCgpXG5cdFx0Y29uc3Qgc291cmNlMSA9IGF1ZGlvQ3R4LmNyZWF0ZU1lZGlhRWxlbWVudFNvdXJjZShhdWRpbzEpXG5cdFx0Y29uc3Qgc291cmNlMiA9IGF1ZGlvQ3R4LmNyZWF0ZU1lZGlhRWxlbWVudFNvdXJjZShhdWRpbzIpXG5cblx0XHRjb25zdCBnYWluMSA9IGF1ZGlvQ3R4LmNyZWF0ZUdhaW4oKVxuXHRcdGNvbnN0IGdhaW4yID0gYXVkaW9DdHguY3JlYXRlR2FpbigpXG5cdFx0Z2FpbjEuZ2Fpbi52YWx1ZSA9IDFcblx0XHRnYWluMi5nYWluLnZhbHVlID0gMFxuXHRcdFxuXHRcdHNvdXJjZTEuY29ubmVjdChnYWluMSlcblx0XHRzb3VyY2UyLmNvbm5lY3QoZ2FpbjIpXG5cblx0XHRnYWluMS5jb25uZWN0KGF1ZGlvQ3R4LmRlc3RpbmF0aW9uKVxuXHRcdGdhaW4yLmNvbm5lY3QoYXVkaW9DdHguZGVzdGluYXRpb24pXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iXX0=
