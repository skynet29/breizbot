$$.control.registerControl('infoPage', {

    template: "<div class=\"titleBar\">\n    <h3 bn-text=\"title\"></h3>\n\n    <span bn-attr=\"{class: getColorClass}\">\n        <i bn-attr=\"{class: iconCls}\"></i>\n    </span>\n</div>\n<h3>Description</h3>\n<p class=\"w3-padding\" bn-html=\"description\"></p>\n",

    props: {
        info: {}
    },

    init: function(elt) {

        let {info} = this.props

        let {description, title, iconCls, colorCls} = info.props

        description = description || "No description"
        description = description.split(';').join('<br>')


        const ctrl = $$.viewController(elt, {
            data: {
                btnText: function() {
                    return (info.activated) ? 'Remove from Home page' : 'Add to Home page'
                },
                description,
                title,
                iconCls,
                getColorClass: function() {
                    return `tile w3-round-large ${colorCls}`
                }
            }
        })

    }
});
$$.control.registerControl('rootPage', {

	deps: [
		'breizbot.apps',
		'breizbot.pager', 
		'breizbot.users',
		'breizbot.scheduler'
	],

	template: "<div bn-control=\"breizbot.apps\" \n	bn-data=\"{apps, showActivated: true, items: getItems}\" \n	bn-event=\"appclick: onAppClick, appcontextmenu: onTileContextMenu\"\n	bn-iface=\"apps\"\n	style=\"height: 100%\">\n		\n	</div>",

	init: function(elt, srvApps, pager, users, scheduler) {

		const ctrl = $$.viewController(elt, {
			data: {
				apps: [],
				getItems: function() {
					return function(data) {
						const ret = {
							info: {name: 'Information', icon: 'fas fa-info-circle'}
						}
						if (!data.activated) {
							ret.add = {name: 'Add to Home page', icon: 'fas fa-plus'}
						}
						return ret
					}
				}
			},
			events: {
				onAppClick: function(ev, data) {
					console.log('onAppClick', data)
					scheduler.openApp(data.appName)
				},
				onTileContextMenu: async function(ev, data) {
					//console.log('onTileContextMenu', data)
					if (data.cmd == 'info') {
						pager.pushPage('infoPage', {
							title: 'App Information',
							props: {
								info: data
							}
						})
	
					}
					if (data.cmd == 'add') {
						await users.activateApp(data.appName, true)
						listAll()

					}
				}

			}
		})

		async function listAll() {
			const apps = await srvApps.listAll()
			console.log('apps', apps)
			ctrl.setData({apps})
		}

		listAll()
	}
});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZm8uanMiLCJtYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2luZm9QYWdlJywge1xuXG4gICAgdGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidGl0bGVCYXJcXFwiPlxcbiAgICA8aDMgYm4tdGV4dD1cXFwidGl0bGVcXFwiPjwvaDM+XFxuXFxuICAgIDxzcGFuIGJuLWF0dHI9XFxcIntjbGFzczogZ2V0Q29sb3JDbGFzc31cXFwiPlxcbiAgICAgICAgPGkgYm4tYXR0cj1cXFwie2NsYXNzOiBpY29uQ2xzfVxcXCI+PC9pPlxcbiAgICA8L3NwYW4+XFxuPC9kaXY+XFxuPGgzPkRlc2NyaXB0aW9uPC9oMz5cXG48cCBjbGFzcz1cXFwidzMtcGFkZGluZ1xcXCIgYm4taHRtbD1cXFwiZGVzY3JpcHRpb25cXFwiPjwvcD5cXG5cIixcblxuICAgIHByb3BzOiB7XG4gICAgICAgIGluZm86IHt9XG4gICAgfSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXG4gICAgICAgIGxldCB7aW5mb30gPSB0aGlzLnByb3BzXG5cbiAgICAgICAgbGV0IHtkZXNjcmlwdGlvbiwgdGl0bGUsIGljb25DbHMsIGNvbG9yQ2xzfSA9IGluZm8ucHJvcHNcblxuICAgICAgICBkZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW9uIHx8IFwiTm8gZGVzY3JpcHRpb25cIlxuICAgICAgICBkZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW9uLnNwbGl0KCc7Jykuam9pbignPGJyPicpXG5cblxuICAgICAgICBjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgYnRuVGV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAoaW5mby5hY3RpdmF0ZWQpID8gJ1JlbW92ZSBmcm9tIEhvbWUgcGFnZScgOiAnQWRkIHRvIEhvbWUgcGFnZSdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICAgICAgICAgIHRpdGxlLFxuICAgICAgICAgICAgICAgIGljb25DbHMsXG4gICAgICAgICAgICAgICAgZ2V0Q29sb3JDbGFzczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBgdGlsZSB3My1yb3VuZC1sYXJnZSAke2NvbG9yQ2xzfWBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICB9XG59KTsiLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncm9vdFBhZ2UnLCB7XG5cblx0ZGVwczogW1xuXHRcdCdicmVpemJvdC5hcHBzJyxcblx0XHQnYnJlaXpib3QucGFnZXInLCBcblx0XHQnYnJlaXpib3QudXNlcnMnLFxuXHRcdCdicmVpemJvdC5zY2hlZHVsZXInXG5cdF0sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5hcHBzXFxcIiBcXG5cdGJuLWRhdGE9XFxcInthcHBzLCBzaG93QWN0aXZhdGVkOiB0cnVlLCBpdGVtczogZ2V0SXRlbXN9XFxcIiBcXG5cdGJuLWV2ZW50PVxcXCJhcHBjbGljazogb25BcHBDbGljaywgYXBwY29udGV4dG1lbnU6IG9uVGlsZUNvbnRleHRNZW51XFxcIlxcblx0Ym4taWZhY2U9XFxcImFwcHNcXFwiXFxuXHRzdHlsZT1cXFwiaGVpZ2h0OiAxMDAlXFxcIj5cXG5cdFx0XFxuXHQ8L2Rpdj5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydkFwcHMsIHBhZ2VyLCB1c2Vycywgc2NoZWR1bGVyKSB7XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGFwcHM6IFtdLFxuXHRcdFx0XHRnZXRJdGVtczogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHJldCA9IHtcblx0XHRcdFx0XHRcdFx0aW5mbzoge25hbWU6ICdJbmZvcm1hdGlvbicsIGljb246ICdmYXMgZmEtaW5mby1jaXJjbGUnfVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKCFkYXRhLmFjdGl2YXRlZCkge1xuXHRcdFx0XHRcdFx0XHRyZXQuYWRkID0ge25hbWU6ICdBZGQgdG8gSG9tZSBwYWdlJywgaWNvbjogJ2ZhcyBmYS1wbHVzJ31cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiByZXRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25BcHBDbGljazogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25BcHBDbGljaycsIGRhdGEpXG5cdFx0XHRcdFx0c2NoZWR1bGVyLm9wZW5BcHAoZGF0YS5hcHBOYW1lKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblRpbGVDb250ZXh0TWVudTogYXN5bmMgZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblRpbGVDb250ZXh0TWVudScsIGRhdGEpXG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdpbmZvJykge1xuXHRcdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2luZm9QYWdlJywge1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ0FwcCBJbmZvcm1hdGlvbicsXG5cdFx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdFx0aW5mbzogZGF0YVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KVxuXHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdhZGQnKSB7XG5cdFx0XHRcdFx0XHRhd2FpdCB1c2Vycy5hY3RpdmF0ZUFwcChkYXRhLmFwcE5hbWUsIHRydWUpXG5cdFx0XHRcdFx0XHRsaXN0QWxsKClcblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGFzeW5jIGZ1bmN0aW9uIGxpc3RBbGwoKSB7XG5cdFx0XHRjb25zdCBhcHBzID0gYXdhaXQgc3J2QXBwcy5saXN0QWxsKClcblx0XHRcdGNvbnNvbGUubG9nKCdhcHBzJywgYXBwcylcblx0XHRcdGN0cmwuc2V0RGF0YSh7YXBwc30pXG5cdFx0fVxuXG5cdFx0bGlzdEFsbCgpXG5cdH1cbn0pO1xuXG5cblxuXG4iXX0=
