$$.control.registerControl('rootPage', {

	template: "<div class=\"toolbar\">\n<p>Click on a user to see the files shared by him</p>\n</div>\n<div \n	bn-control=\"breizbot.friends\" \n	bn-iface=\"friends\" \n	bn-event=\"friendclick: onSelectFriend\"\n	bn-data=\"{showConnectionState: false}\"\n	></div>",

	deps: ['breizbot.pager', 'breizbot.files'],

	init: function(elt, pager, srvFiles) {

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onSelectFriend: function(ev, data) {
					//console.log('onSelectFriend', data)
					const {userName} = data
					pager.pushPage('breizbot.files', {
						title: userName,
						props: {
							friendUser: userName
						},
						events: {
							fileclick: function(ev, info) {
								const fullName = info.rootDir + info.fileName

								const type = $$.util.getFileType(info.fileName)
								if (type != undefined) {
									pager.pushPage('breizbot.viewer', {
										title: info.fileName,
										props: {
											type,
											url: srvFiles.fileUrl(fullName, userName)
										}
									})
								}					
			
							}
						}
					})
				}				
			}
		})	

	}
});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcbjxwPkNsaWNrIG9uIGEgdXNlciB0byBzZWUgdGhlIGZpbGVzIHNoYXJlZCBieSBoaW08L3A+XFxuPC9kaXY+XFxuPGRpdiBcXG5cdGJuLWNvbnRyb2w9XFxcImJyZWl6Ym90LmZyaWVuZHNcXFwiIFxcblx0Ym4taWZhY2U9XFxcImZyaWVuZHNcXFwiIFxcblx0Ym4tZXZlbnQ9XFxcImZyaWVuZGNsaWNrOiBvblNlbGVjdEZyaWVuZFxcXCJcXG5cdGJuLWRhdGE9XFxcIntzaG93Q29ubmVjdGlvblN0YXRlOiBmYWxzZX1cXFwiXFxuXHQ+PC9kaXY+XCIsXG5cblx0ZGVwczogWydicmVpemJvdC5wYWdlcicsICdicmVpemJvdC5maWxlcyddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgcGFnZXIsIHNydkZpbGVzKSB7XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uU2VsZWN0RnJpZW5kOiBmdW5jdGlvbihldiwgZGF0YSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uU2VsZWN0RnJpZW5kJywgZGF0YSlcblx0XHRcdFx0XHRjb25zdCB7dXNlck5hbWV9ID0gZGF0YVxuXHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdicmVpemJvdC5maWxlcycsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiB1c2VyTmFtZSxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdGZyaWVuZFVzZXI6IHVzZXJOYW1lXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdFx0XHRcdGZpbGVjbGljazogZnVuY3Rpb24oZXYsIGluZm8pIHtcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBmdWxsTmFtZSA9IGluZm8ucm9vdERpciArIGluZm8uZmlsZU5hbWVcblxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHR5cGUgPSAkJC51dGlsLmdldEZpbGVUeXBlKGluZm8uZmlsZU5hbWUpXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHR5cGUgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYnJlaXpib3Qudmlld2VyJywge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR0aXRsZTogaW5mby5maWxlTmFtZSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0eXBlLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHVybDogc3J2RmlsZXMuZmlsZVVybChmdWxsTmFtZSwgdXNlck5hbWUpXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdFx0fVx0XHRcdFx0XHRcblx0XHRcdFxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fVx0XHRcdFx0XG5cdFx0XHR9XG5cdFx0fSlcdFxuXG5cdH1cbn0pO1xuXG5cblxuXG4iXX0=
