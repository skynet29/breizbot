$$.control.registerControl('infoPage', {

    deps: ['breizbot.users'],

    template: "<div class=\"titleBar\">\n    <h3 bn-text=\"title\"></h3>\n\n    <span bn-attr=\"{class: getColorClass}\">\n        <i bn-attr=\"{class: iconCls}\"></i>\n    </span>\n</div>\n<h3>Description</h3>\n<p class=\"w3-padding\" bn-html=\"description\"></p>\n<button class=\"w3-button w3-blue\" bn-text=\"btnText\" bn-event=\"click: onClick\"></button>",

    props: {
        info: {}
    },

    init: function(elt, users) {

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
            },
            events: {
                onClick: async function() {
                    await users.activateApp(info.appName, !info.activated)
                    info.activated = !info.activated
                    ctrl.update()

                }
            }
        })

    }
});
$$.control.registerControl('rootPage', {

	deps: ['breizbot.apps', 'breizbot.pager'],

	template: "<div bn-control=\"breizbot.apps\" \n	bn-data=\"{apps, showActivated: true}\" \n	bn-event=\"appclick: onAppClick\"\n	bn-iface=\"apps\"\n	style=\"height: 100%\">\n		\n	</div>",

	init: function(elt, srvApps, pager) {

		const ctrl = $$.viewController(elt, {
			data: {
				apps: []
			},
			events: {
				onAppClick: function(ev, data) {
					console.log('onAppClick', data)

					pager.pushPage('infoPage', {
						title: 'App Information',
						props: {
							info: data
						},
						onBack: listAll
					})
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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZm8uanMiLCJtYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdpbmZvUGFnZScsIHtcblxuICAgIGRlcHM6IFsnYnJlaXpib3QudXNlcnMnXSxcblxuICAgIHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRpdGxlQmFyXFxcIj5cXG4gICAgPGgzIGJuLXRleHQ9XFxcInRpdGxlXFxcIj48L2gzPlxcblxcbiAgICA8c3BhbiBibi1hdHRyPVxcXCJ7Y2xhc3M6IGdldENvbG9yQ2xhc3N9XFxcIj5cXG4gICAgICAgIDxpIGJuLWF0dHI9XFxcIntjbGFzczogaWNvbkNsc31cXFwiPjwvaT5cXG4gICAgPC9zcGFuPlxcbjwvZGl2PlxcbjxoMz5EZXNjcmlwdGlvbjwvaDM+XFxuPHAgY2xhc3M9XFxcInczLXBhZGRpbmdcXFwiIGJuLWh0bWw9XFxcImRlc2NyaXB0aW9uXFxcIj48L3A+XFxuPGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLWJsdWVcXFwiIGJuLXRleHQ9XFxcImJ0blRleHRcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25DbGlja1xcXCI+PC9idXR0b24+XCIsXG5cbiAgICBwcm9wczoge1xuICAgICAgICBpbmZvOiB7fVxuICAgIH0sXG5cbiAgICBpbml0OiBmdW5jdGlvbihlbHQsIHVzZXJzKSB7XG5cbiAgICAgICAgbGV0IHtpbmZvfSA9IHRoaXMucHJvcHNcblxuICAgICAgICBsZXQge2Rlc2NyaXB0aW9uLCB0aXRsZSwgaWNvbkNscywgY29sb3JDbHN9ID0gaW5mby5wcm9wc1xuXG4gICAgICAgIGRlc2NyaXB0aW9uID0gZGVzY3JpcHRpb24gfHwgXCJObyBkZXNjcmlwdGlvblwiXG4gICAgICAgIGRlc2NyaXB0aW9uID0gZGVzY3JpcHRpb24uc3BsaXQoJzsnKS5qb2luKCc8YnI+JylcblxuXG4gICAgICAgIGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBidG5UZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChpbmZvLmFjdGl2YXRlZCkgPyAnUmVtb3ZlIGZyb20gSG9tZSBwYWdlJyA6ICdBZGQgdG8gSG9tZSBwYWdlJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgdGl0bGUsXG4gICAgICAgICAgICAgICAgaWNvbkNscyxcbiAgICAgICAgICAgICAgICBnZXRDb2xvckNsYXNzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGB0aWxlIHczLXJvdW5kLWxhcmdlICR7Y29sb3JDbHN9YFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBldmVudHM6IHtcbiAgICAgICAgICAgICAgICBvbkNsaWNrOiBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdXNlcnMuYWN0aXZhdGVBcHAoaW5mby5hcHBOYW1lLCAhaW5mby5hY3RpdmF0ZWQpXG4gICAgICAgICAgICAgICAgICAgIGluZm8uYWN0aXZhdGVkID0gIWluZm8uYWN0aXZhdGVkXG4gICAgICAgICAgICAgICAgICAgIGN0cmwudXBkYXRlKClcblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgIH1cbn0pOyIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmFwcHMnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLWNvbnRyb2w9XFxcImJyZWl6Ym90LmFwcHNcXFwiIFxcblx0Ym4tZGF0YT1cXFwie2FwcHMsIHNob3dBY3RpdmF0ZWQ6IHRydWV9XFxcIiBcXG5cdGJuLWV2ZW50PVxcXCJhcHBjbGljazogb25BcHBDbGlja1xcXCJcXG5cdGJuLWlmYWNlPVxcXCJhcHBzXFxcIlxcblx0c3R5bGU9XFxcImhlaWdodDogMTAwJVxcXCI+XFxuXHRcdFxcblx0PC9kaXY+XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBzcnZBcHBzLCBwYWdlcikge1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRhcHBzOiBbXVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkFwcENsaWNrOiBmdW5jdGlvbihldiwgZGF0YSkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkFwcENsaWNrJywgZGF0YSlcblxuXHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdpbmZvUGFnZScsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnQXBwIEluZm9ybWF0aW9uJyxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdGluZm86IGRhdGFcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRvbkJhY2s6IGxpc3RBbGxcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gbGlzdEFsbCgpIHtcblx0XHRcdGNvbnN0IGFwcHMgPSBhd2FpdCBzcnZBcHBzLmxpc3RBbGwoKVxuXHRcdFx0Y29uc29sZS5sb2coJ2FwcHMnLCBhcHBzKVxuXHRcdFx0Y3RybC5zZXREYXRhKHthcHBzfSlcblx0XHR9XG5cblx0XHRsaXN0QWxsKClcblx0fVxufSk7XG5cblxuXG5cbiJdfQ==
