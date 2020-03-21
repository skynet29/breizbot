$$.control.registerControl('rootPage', {

	template: "<div bn-control=\"breizbot.rtc\" \n	bn-data=\"{\n		appName:\'tchat\',\n		iconCls: \'fa fa-comments\',\n		title: \'Select a friend to tchat with\'\n	}\"\n	bn-event=\"rtchangup: onHangup\"\n>\n\n\n	<div class=\"content\" bn-bind=\"content\">\n		<div bn-each=\"messages\" class=\"messages\">\n			<div class=\"me\" bn-show=\"$scope.$i.me\">\n				<div bn-text=\"$scope.$i.text\" class=\"text\"></div>\n				<div bn-text=\"$scope.$i.time\"></div>			\n			</div>\n			<div class=\"you\" bn-show=\"!$scope.$i.me\">\n				<div bn-text=\"$scope.$i.time\"></div>			\n				<div bn-text=\"$scope.$i.text\" class=\"text\"></div>\n			</div>\n		</div>\n		\n	</div>\n\n	<div class=\"footer\">\n		<form bn-event=\"submit: onSubmit\">\n			<input type=\"text\" name=\"message\" required=\"\" placeholder=\"Write a message...\" autocomplete=\"off\">\n			<button class=\"w3-button w3-blue\" type=\"submit\">Send</button>\n		</form>\n	</div>\n\n</div>",

	deps: ['breizbot.rtc'],

	init: function(elt, rtc) {

		rtc.on('bye', () => {
			ctrl.setData({messages: []})
		})

		const ctrl = $$.viewController(elt, {
			data: {
				messages: []				
			},
			events: {
				onSubmit: function(ev) {
					ev.preventDefault()
					const {message} = $(this).getFormData()
					$(this).resetForm()
					console.log('onSubmit', message)
					rtc.sendData('tchat', message)
					addMessage(message, true, new Date())
				},
				onHangup: function() {
					ctrl.setData({messages: []})
				}
			}
		})


		function addMessage(text, isMe, date) {
			ctrl.model.messages.push({
				text,
				me: isMe,
				time: date.toLocaleTimeString()
			})
			ctrl.update()		
			ctrl.scope.content.scrollToBottom()				
		}


		rtc.onData('tchat', function(text, time) {
			addMessage(text, false, new Date(time))
		})		

	
		rtc.on('ready', () => { 
			if (rtc.isCallee) {
				rtc.accept()				
			}			
		})

		this.onAppExit = function() {
			return rtc.bye()
		}


	}


});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncm9vdFBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5ydGNcXFwiIFxcblx0Ym4tZGF0YT1cXFwie1xcblx0XHRhcHBOYW1lOlxcJ3RjaGF0XFwnLFxcblx0XHRpY29uQ2xzOiBcXCdmYSBmYS1jb21tZW50c1xcJyxcXG5cdFx0dGl0bGU6IFxcJ1NlbGVjdCBhIGZyaWVuZCB0byB0Y2hhdCB3aXRoXFwnXFxuXHR9XFxcIlxcblx0Ym4tZXZlbnQ9XFxcInJ0Y2hhbmd1cDogb25IYW5ndXBcXFwiXFxuPlxcblxcblxcblx0PGRpdiBjbGFzcz1cXFwiY29udGVudFxcXCIgYm4tYmluZD1cXFwiY29udGVudFxcXCI+XFxuXHRcdDxkaXYgYm4tZWFjaD1cXFwibWVzc2FnZXNcXFwiIGNsYXNzPVxcXCJtZXNzYWdlc1xcXCI+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwibWVcXFwiIGJuLXNob3c9XFxcIiRzY29wZS4kaS5tZVxcXCI+XFxuXHRcdFx0XHQ8ZGl2IGJuLXRleHQ9XFxcIiRzY29wZS4kaS50ZXh0XFxcIiBjbGFzcz1cXFwidGV4dFxcXCI+PC9kaXY+XFxuXHRcdFx0XHQ8ZGl2IGJuLXRleHQ9XFxcIiRzY29wZS4kaS50aW1lXFxcIj48L2Rpdj5cdFx0XHRcXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJ5b3VcXFwiIGJuLXNob3c9XFxcIiEkc2NvcGUuJGkubWVcXFwiPlxcblx0XHRcdFx0PGRpdiBibi10ZXh0PVxcXCIkc2NvcGUuJGkudGltZVxcXCI+PC9kaXY+XHRcdFx0XFxuXHRcdFx0XHQ8ZGl2IGJuLXRleHQ9XFxcIiRzY29wZS4kaS50ZXh0XFxcIiBjbGFzcz1cXFwidGV4dFxcXCI+PC9kaXY+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdDwvZGl2Plxcblx0XHRcXG5cdDwvZGl2Plxcblxcblx0PGRpdiBjbGFzcz1cXFwiZm9vdGVyXFxcIj5cXG5cdFx0PGZvcm0gYm4tZXZlbnQ9XFxcInN1Ym1pdDogb25TdWJtaXRcXFwiPlxcblx0XHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJtZXNzYWdlXFxcIiByZXF1aXJlZD1cXFwiXFxcIiBwbGFjZWhvbGRlcj1cXFwiV3JpdGUgYSBtZXNzYWdlLi4uXFxcIiBhdXRvY29tcGxldGU9XFxcIm9mZlxcXCI+XFxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLWJsdWVcXFwiIHR5cGU9XFxcInN1Ym1pdFxcXCI+U2VuZDwvYnV0dG9uPlxcblx0XHQ8L2Zvcm0+XFxuXHQ8L2Rpdj5cXG5cXG48L2Rpdj5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnJ0YyddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgcnRjKSB7XG5cblx0XHRydGMub24oJ2J5ZScsICgpID0+IHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7bWVzc2FnZXM6IFtdfSlcblx0XHR9KVxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRtZXNzYWdlczogW11cdFx0XHRcdFxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblN1Ym1pdDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRcdFx0Y29uc3Qge21lc3NhZ2V9ID0gJCh0aGlzKS5nZXRGb3JtRGF0YSgpXG5cdFx0XHRcdFx0JCh0aGlzKS5yZXNldEZvcm0oKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblN1Ym1pdCcsIG1lc3NhZ2UpXG5cdFx0XHRcdFx0cnRjLnNlbmREYXRhKCd0Y2hhdCcsIG1lc3NhZ2UpXG5cdFx0XHRcdFx0YWRkTWVzc2FnZShtZXNzYWdlLCB0cnVlLCBuZXcgRGF0ZSgpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkhhbmd1cDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHttZXNzYWdlczogW119KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXG5cdFx0ZnVuY3Rpb24gYWRkTWVzc2FnZSh0ZXh0LCBpc01lLCBkYXRlKSB7XG5cdFx0XHRjdHJsLm1vZGVsLm1lc3NhZ2VzLnB1c2goe1xuXHRcdFx0XHR0ZXh0LFxuXHRcdFx0XHRtZTogaXNNZSxcblx0XHRcdFx0dGltZTogZGF0ZS50b0xvY2FsZVRpbWVTdHJpbmcoKVxuXHRcdFx0fSlcblx0XHRcdGN0cmwudXBkYXRlKClcdFx0XG5cdFx0XHRjdHJsLnNjb3BlLmNvbnRlbnQuc2Nyb2xsVG9Cb3R0b20oKVx0XHRcdFx0XG5cdFx0fVxuXG5cblx0XHRydGMub25EYXRhKCd0Y2hhdCcsIGZ1bmN0aW9uKHRleHQsIHRpbWUpIHtcblx0XHRcdGFkZE1lc3NhZ2UodGV4dCwgZmFsc2UsIG5ldyBEYXRlKHRpbWUpKVxuXHRcdH0pXHRcdFxuXG5cdFxuXHRcdHJ0Yy5vbigncmVhZHknLCAoKSA9PiB7IFxuXHRcdFx0aWYgKHJ0Yy5pc0NhbGxlZSkge1xuXHRcdFx0XHRydGMuYWNjZXB0KClcdFx0XHRcdFxuXHRcdFx0fVx0XHRcdFxuXHRcdH0pXG5cblx0XHR0aGlzLm9uQXBwRXhpdCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHJ0Yy5ieWUoKVxuXHRcdH1cblxuXG5cdH1cblxuXG59KTtcblxuXG5cblxuIl19
