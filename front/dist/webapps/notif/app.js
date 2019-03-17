$$.control.registerControl('breizbot.main', {

	deps: ['breizbot.users', 'breizbot.broker'],

	template: "<ul class=\"w3-ul w3-border w3-white\" \n	bn-each=\"notifs\" bn-iter=\"n\"\n	bn-event=\"click.delete: onDelete\">\n	<li class=\"w3-bar\" bn-data=\"{notifId: n._id}\">\n		<span class=\"w3-button w3-right delete\" title=\"Delete\"><i class=\"fa fa-times\"></i></span>\n\n		<div class=\"w3-bar-item\" bn-html=\"n.notif\" ></div>\n	</li>\n</ul>	",

	init: function(elt, users, broker) {

		const ctrl = $$.viewController(elt, {
			data: {notifs: []},
			events: {
				onDelete: function() {
					var notifId = $(this).closest('li').data('notifId')
					console.log('onDelete', notifId)
					users.removeNotif(notifId)
				}
			}
		})	

		function updateNotifs() {
			users.getNotifs().then((notifs) => {
				console.log('notifs', notifs)
				ctrl.setData({notifs})
			})				
		}

		broker.register('breizbot.notifCount', function(msg) {
			console.log('msg', msg)
			updateNotifs()
		})

		updateNotifs()

	}
});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90Lm1haW4nLCB7XG5cblx0ZGVwczogWydicmVpemJvdC51c2VycycsICdicmVpemJvdC5icm9rZXInXSxcblxuXHR0ZW1wbGF0ZTogXCI8dWwgY2xhc3M9XFxcInczLXVsIHczLWJvcmRlciB3My13aGl0ZVxcXCIgXFxuXHRibi1lYWNoPVxcXCJub3RpZnNcXFwiIGJuLWl0ZXI9XFxcIm5cXFwiXFxuXHRibi1ldmVudD1cXFwiY2xpY2suZGVsZXRlOiBvbkRlbGV0ZVxcXCI+XFxuXHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCIgYm4tZGF0YT1cXFwie25vdGlmSWQ6IG4uX2lkfVxcXCI+XFxuXHRcdDxzcGFuIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtcmlnaHQgZGVsZXRlXFxcIiB0aXRsZT1cXFwiRGVsZXRlXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtdGltZXNcXFwiPjwvaT48L3NwYW4+XFxuXFxuXHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIiBibi1odG1sPVxcXCJuLm5vdGlmXFxcIiA+PC9kaXY+XFxuXHQ8L2xpPlxcbjwvdWw+XHRcIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHVzZXJzLCBicm9rZXIpIHtcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtub3RpZnM6IFtdfSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkRlbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dmFyIG5vdGlmSWQgPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuZGF0YSgnbm90aWZJZCcpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uRGVsZXRlJywgbm90aWZJZClcblx0XHRcdFx0XHR1c2Vycy5yZW1vdmVOb3RpZihub3RpZklkKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcdFxuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlTm90aWZzKCkge1xuXHRcdFx0dXNlcnMuZ2V0Tm90aWZzKCkudGhlbigobm90aWZzKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdub3RpZnMnLCBub3RpZnMpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7bm90aWZzfSlcblx0XHRcdH0pXHRcdFx0XHRcblx0XHR9XG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90Lm5vdGlmQ291bnQnLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHR1cGRhdGVOb3RpZnMoKVxuXHRcdH0pXG5cblx0XHR1cGRhdGVOb3RpZnMoKVxuXG5cdH1cbn0pO1xuXG5cblxuXG4iXX0=
