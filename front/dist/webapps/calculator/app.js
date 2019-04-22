$$.control.registerControl('rootPage', {

	template: "<table class=\"w3-table\" bn-event=\"click.w3-btn: onClick\">\n	<tr>\n		<td colspan=\"4\">\n			<input type=\"text\" class=\"result\" readonly=\"\" bn-val=\"result\" bn-bind=\"result\">\n		</td>\n	</tr>\n	<tr>\n		<td><button class=\"clear\">C</button></td>\n		<td></td>\n		<td></td>\n		<td><button data-ope=\"/\"><i class=\"fa fa-divide\"></i></button></td>\n	</tr>\n\n	<tr>\n		<td><button>1</button></td>\n		<td><button>2</button></td>\n		<td><button>3</button></td>\n		<td><button data-ope=\"*\"><i class=\"fa fa-times\"></i></button></td>\n	</tr>\n\n	<tr>\n		<td><button>4</button></td>\n		<td><button>5</button></td>\n		<td><button>6</button></td>\n		<td><button data-ope=\"-\"><i class=\"fa fa-minus\"></i></button></td>\n	</tr>\n\n	<tr>\n		<td><button>7</button></td>\n		<td><button>8</button></td>\n		<td><button>9</button></td>\n		<td><button data-ope=\"+\"><i class=\"fa fa-plus\"></i></button></td>\n	</tr>\n\n	<tr>\n		<td><button>.</button></td>\n		<td><button>0</button></td>\n		<td colspan=\"2\"><button class=\"equals\"><i class=\"fa fa-equals\"></i></button></td>\n	</tr>\n\n</table>",


	init: function(elt) {

		elt.find('button').addClass('w3-btn w3-blue w3-block')
		elt.find('button.equals').removeClass('w3-blue').addClass('w3-green')
		elt.find('button.clear').removeClass('w3-blue').addClass('w3-red')

		$(document).on('keypress', (ev)=> {
			//console.log('keypress', ev.key)
			handleInput(ev.key)
		})
		let first = true

		const ctrl = $$.viewController(elt, {
			data: {
				result: ''
			},
			events: {
				onClick: function(ev) {
					let key = $(this).data('ope')

					if (key == undefined) {
						key = $(this).text()
					}

					if ($(this).hasClass('clear')) {
						key = 'Delete'
					}

					if ($(this).hasClass('equals')) {
						key = 'Enter'
					}

					handleInput(key)
				}
			}
		})

		function handleInput(key) {
			//console.log('handleInput', key)

			if (key == 'Delete') {
				ctrl.setData({result: ''})
				first = true
			}
			else if (key == 'Enter') {
				const result = $$.util.safeEval(ctrl.model.result)
				//console.log('result', result)
				ctrl.setData({result})				
				first = true
			}
			else if ('+-*/'.includes(key)) {
				ctrl.model.result += key
				first = false
				ctrl.update()
			}
			else if ('1234567890.'.includes(key)) {
				if (first) {
					if (key == '.') {
						ctrl.model.result = '0.'
					}
					else {
						ctrl.model.result = key
					}
				}
				else {
					ctrl.model.result += key
				}
				first = false
				ctrl.update()
			}	

			if (key == 'Enter')
				ctrl.scope.result.scrollLeft(0)
			else
				ctrl.scope.result.scrollLeft(10000)
		}

	}
});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncm9vdFBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPHRhYmxlIGNsYXNzPVxcXCJ3My10YWJsZVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLnczLWJ0bjogb25DbGlja1xcXCI+XFxuXHQ8dHI+XFxuXHRcdDx0ZCBjb2xzcGFuPVxcXCI0XFxcIj5cXG5cdFx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgY2xhc3M9XFxcInJlc3VsdFxcXCIgcmVhZG9ubHk9XFxcIlxcXCIgYm4tdmFsPVxcXCJyZXN1bHRcXFwiIGJuLWJpbmQ9XFxcInJlc3VsdFxcXCI+XFxuXHRcdDwvdGQ+XFxuXHQ8L3RyPlxcblx0PHRyPlxcblx0XHQ8dGQ+PGJ1dHRvbiBjbGFzcz1cXFwiY2xlYXJcXFwiPkM8L2J1dHRvbj48L3RkPlxcblx0XHQ8dGQ+PC90ZD5cXG5cdFx0PHRkPjwvdGQ+XFxuXHRcdDx0ZD48YnV0dG9uIGRhdGEtb3BlPVxcXCIvXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZGl2aWRlXFxcIj48L2k+PC9idXR0b24+PC90ZD5cXG5cdDwvdHI+XFxuXFxuXHQ8dHI+XFxuXHRcdDx0ZD48YnV0dG9uPjE8L2J1dHRvbj48L3RkPlxcblx0XHQ8dGQ+PGJ1dHRvbj4yPC9idXR0b24+PC90ZD5cXG5cdFx0PHRkPjxidXR0b24+MzwvYnV0dG9uPjwvdGQ+XFxuXHRcdDx0ZD48YnV0dG9uIGRhdGEtb3BlPVxcXCIqXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtdGltZXNcXFwiPjwvaT48L2J1dHRvbj48L3RkPlxcblx0PC90cj5cXG5cXG5cdDx0cj5cXG5cdFx0PHRkPjxidXR0b24+NDwvYnV0dG9uPjwvdGQ+XFxuXHRcdDx0ZD48YnV0dG9uPjU8L2J1dHRvbj48L3RkPlxcblx0XHQ8dGQ+PGJ1dHRvbj42PC9idXR0b24+PC90ZD5cXG5cdFx0PHRkPjxidXR0b24gZGF0YS1vcGU9XFxcIi1cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1taW51c1xcXCI+PC9pPjwvYnV0dG9uPjwvdGQ+XFxuXHQ8L3RyPlxcblxcblx0PHRyPlxcblx0XHQ8dGQ+PGJ1dHRvbj43PC9idXR0b24+PC90ZD5cXG5cdFx0PHRkPjxidXR0b24+ODwvYnV0dG9uPjwvdGQ+XFxuXHRcdDx0ZD48YnV0dG9uPjk8L2J1dHRvbj48L3RkPlxcblx0XHQ8dGQ+PGJ1dHRvbiBkYXRhLW9wZT1cXFwiK1xcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBsdXNcXFwiPjwvaT48L2J1dHRvbj48L3RkPlxcblx0PC90cj5cXG5cXG5cdDx0cj5cXG5cdFx0PHRkPjxidXR0b24+LjwvYnV0dG9uPjwvdGQ+XFxuXHRcdDx0ZD48YnV0dG9uPjA8L2J1dHRvbj48L3RkPlxcblx0XHQ8dGQgY29sc3Bhbj1cXFwiMlxcXCI+PGJ1dHRvbiBjbGFzcz1cXFwiZXF1YWxzXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZXF1YWxzXFxcIj48L2k+PC9idXR0b24+PC90ZD5cXG5cdDwvdHI+XFxuXFxuPC90YWJsZT5cIixcblxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXG5cdFx0ZWx0LmZpbmQoJ2J1dHRvbicpLmFkZENsYXNzKCd3My1idG4gdzMtYmx1ZSB3My1ibG9jaycpXG5cdFx0ZWx0LmZpbmQoJ2J1dHRvbi5lcXVhbHMnKS5yZW1vdmVDbGFzcygndzMtYmx1ZScpLmFkZENsYXNzKCd3My1ncmVlbicpXG5cdFx0ZWx0LmZpbmQoJ2J1dHRvbi5jbGVhcicpLnJlbW92ZUNsYXNzKCd3My1ibHVlJykuYWRkQ2xhc3MoJ3czLXJlZCcpXG5cblx0XHQkKGRvY3VtZW50KS5vbigna2V5cHJlc3MnLCAoZXYpPT4ge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygna2V5cHJlc3MnLCBldi5rZXkpXG5cdFx0XHRoYW5kbGVJbnB1dChldi5rZXkpXG5cdFx0fSlcblx0XHRsZXQgZmlyc3QgPSB0cnVlXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHJlc3VsdDogJydcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25DbGljazogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRsZXQga2V5ID0gJCh0aGlzKS5kYXRhKCdvcGUnKVxuXG5cdFx0XHRcdFx0aWYgKGtleSA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdGtleSA9ICQodGhpcykudGV4dCgpXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCQodGhpcykuaGFzQ2xhc3MoJ2NsZWFyJykpIHtcblx0XHRcdFx0XHRcdGtleSA9ICdEZWxldGUnXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCQodGhpcykuaGFzQ2xhc3MoJ2VxdWFscycpKSB7XG5cdFx0XHRcdFx0XHRrZXkgPSAnRW50ZXInXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aGFuZGxlSW5wdXQoa2V5KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGZ1bmN0aW9uIGhhbmRsZUlucHV0KGtleSkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnaGFuZGxlSW5wdXQnLCBrZXkpXG5cblx0XHRcdGlmIChrZXkgPT0gJ0RlbGV0ZScpIHtcblx0XHRcdFx0Y3RybC5zZXREYXRhKHtyZXN1bHQ6ICcnfSlcblx0XHRcdFx0Zmlyc3QgPSB0cnVlXG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChrZXkgPT0gJ0VudGVyJykge1xuXHRcdFx0XHRjb25zdCByZXN1bHQgPSAkJC51dGlsLnNhZmVFdmFsKGN0cmwubW9kZWwucmVzdWx0KVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdyZXN1bHQnLCByZXN1bHQpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7cmVzdWx0fSlcdFx0XHRcdFxuXHRcdFx0XHRmaXJzdCA9IHRydWVcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKCcrLSovJy5pbmNsdWRlcyhrZXkpKSB7XG5cdFx0XHRcdGN0cmwubW9kZWwucmVzdWx0ICs9IGtleVxuXHRcdFx0XHRmaXJzdCA9IGZhbHNlXG5cdFx0XHRcdGN0cmwudXBkYXRlKClcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKCcxMjM0NTY3ODkwLicuaW5jbHVkZXMoa2V5KSkge1xuXHRcdFx0XHRpZiAoZmlyc3QpIHtcblx0XHRcdFx0XHRpZiAoa2V5ID09ICcuJykge1xuXHRcdFx0XHRcdFx0Y3RybC5tb2RlbC5yZXN1bHQgPSAnMC4nXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0Y3RybC5tb2RlbC5yZXN1bHQgPSBrZXlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y3RybC5tb2RlbC5yZXN1bHQgKz0ga2V5XG5cdFx0XHRcdH1cblx0XHRcdFx0Zmlyc3QgPSBmYWxzZVxuXHRcdFx0XHRjdHJsLnVwZGF0ZSgpXG5cdFx0XHR9XHRcblxuXHRcdFx0aWYgKGtleSA9PSAnRW50ZXInKVxuXHRcdFx0XHRjdHJsLnNjb3BlLnJlc3VsdC5zY3JvbGxMZWZ0KDApXG5cdFx0XHRlbHNlXG5cdFx0XHRcdGN0cmwuc2NvcGUucmVzdWx0LnNjcm9sbExlZnQoMTAwMDApXG5cdFx0fVxuXG5cdH1cbn0pO1xuXG5cblxuXG4iXX0=
