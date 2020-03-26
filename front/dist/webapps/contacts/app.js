$$.control.registerControl('addContactPage', {

	template: "<form bn-event=\"submit: onSubmit\" bn-form=\"from\">\n	<div bn-control=\"brainjs.inputgroup\">\n		<label>Name:</label><br>\n		<input type=\"text\" name=\"name\" style=\"min-width: 300px\" required=\"\" autofocus=\"\">	\n	</div>\n	<br>\n\n	<div bn-control=\"brainjs.inputgroup\">\n		<label>Email:</label><br>\n		<input type=\"email\" name=\"email\" style=\"min-width: 300px\" required=\"\">	\n	</div>	\n\n	<input type=\"submit\" bn-bind=\"submit\" hidden=\"\">\n</form>\n",

	deps: ['breizbot.users', 'breizbot.pager'],

	props: {
		from: {}
	},

	init: function(elt, users, pager) {

		const {from} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				from
			},
			events: {
				onSubmit: function(ev) {
					ev.preventDefault()
					const data = $(this).getFormData()
					console.log('data', data)
					users.addContact(data.name, data.email).then(() => {
						console.log('contact added !')
						pager.popPage()
					})
					.catch((err) => {
						$$.ui.showAlert({title: 'Error', content: err.responseText})
					})
				}

			}
		})

		this.getButtons = function() {
			return 	{
				add: {
					title: 'Add',
					icon: 'fa fa-user-plus',
					onClick: function() {
						ctrl.scope.submit.click()
					}
				}
			}
		}		
	}

});





$$.control.registerControl('rootPage', {

	template: "<div class=\"toolbar\">\n	<button \n		class=\"w3-btn w3-blue\" \n		title=\"Add Contact\"\n		bn-event=\"click: onAddContact\"\n\n	><i class=\"fa fa-user-plus\"></i></button>	\n</div>\n<div class=\"scrollPanel\">\n	<div bn-control=\"breizbot.contacts\" data-show-delete-button=\"true\" bn-iface=\"contacts\"></div>	\n</div>\n",

	deps: ['breizbot.pager'],


	init: function(elt, pager) {

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onAddContact: function() {
					console.log('onAddContact')
					pager.pushPage('addContactPage', {
						title: 'Add Contact',
						onReturn: function(data) {
							ctrl.scope.contacts.update()
						}
					})
				}
			}
		})



	}


});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkZENvbnRhY3QuanMiLCJtYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2FkZENvbnRhY3RQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxmb3JtIGJuLWV2ZW50PVxcXCJzdWJtaXQ6IG9uU3VibWl0XFxcIiBibi1mb3JtPVxcXCJmcm9tXFxcIj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0PGxhYmVsPk5hbWU6PC9sYWJlbD48YnI+XFxuXHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJuYW1lXFxcIiBzdHlsZT1cXFwibWluLXdpZHRoOiAzMDBweFxcXCIgcmVxdWlyZWQ9XFxcIlxcXCIgYXV0b2ZvY3VzPVxcXCJcXFwiPlx0XFxuXHQ8L2Rpdj5cXG5cdDxicj5cXG5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0PGxhYmVsPkVtYWlsOjwvbGFiZWw+PGJyPlxcblx0XHQ8aW5wdXQgdHlwZT1cXFwiZW1haWxcXFwiIG5hbWU9XFxcImVtYWlsXFxcIiBzdHlsZT1cXFwibWluLXdpZHRoOiAzMDBweFxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XHRcXG5cdDwvZGl2Plx0XFxuXFxuXHQ8aW5wdXQgdHlwZT1cXFwic3VibWl0XFxcIiBibi1iaW5kPVxcXCJzdWJtaXRcXFwiIGhpZGRlbj1cXFwiXFxcIj5cXG48L2Zvcm0+XFxuXCIsXG5cblx0ZGVwczogWydicmVpemJvdC51c2VycycsICdicmVpemJvdC5wYWdlciddLFxuXG5cdHByb3BzOiB7XG5cdFx0ZnJvbToge31cblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHVzZXJzLCBwYWdlcikge1xuXG5cdFx0Y29uc3Qge2Zyb219ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRmcm9tXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uU3VibWl0OiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHRjb25zdCBkYXRhID0gJCh0aGlzKS5nZXRGb3JtRGF0YSgpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ2RhdGEnLCBkYXRhKVxuXHRcdFx0XHRcdHVzZXJzLmFkZENvbnRhY3QoZGF0YS5uYW1lLCBkYXRhLmVtYWlsKS50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdjb250YWN0IGFkZGVkICEnKVxuXHRcdFx0XHRcdFx0cGFnZXIucG9wUGFnZSgpXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQuY2F0Y2goKGVycikgPT4ge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ0Vycm9yJywgY29udGVudDogZXJyLnJlc3BvbnNlVGV4dH0pXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdHRoaXMuZ2V0QnV0dG9ucyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIFx0e1xuXHRcdFx0XHRhZGQ6IHtcblx0XHRcdFx0XHR0aXRsZTogJ0FkZCcsXG5cdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLXVzZXItcGx1cycsXG5cdFx0XHRcdFx0b25DbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRjdHJsLnNjb3BlLnN1Ym1pdC5jbGljaygpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVx0XHRcblx0fVxuXG59KTtcblxuXG5cblxuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblx0PGJ1dHRvbiBcXG5cdFx0Y2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiBcXG5cdFx0dGl0bGU9XFxcIkFkZCBDb250YWN0XFxcIlxcblx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQWRkQ29udGFjdFxcXCJcXG5cXG5cdD48aSBjbGFzcz1cXFwiZmEgZmEtdXNlci1wbHVzXFxcIj48L2k+PC9idXR0b24+XHRcXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCI+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyZWl6Ym90LmNvbnRhY3RzXFxcIiBkYXRhLXNob3ctZGVsZXRlLWJ1dHRvbj1cXFwidHJ1ZVxcXCIgYm4taWZhY2U9XFxcImNvbnRhY3RzXFxcIj48L2Rpdj5cdFxcbjwvZGl2PlxcblwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInXSxcblxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgcGFnZXIpIHtcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25BZGRDb250YWN0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25BZGRDb250YWN0Jylcblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYWRkQ29udGFjdFBhZ2UnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ0FkZCBDb250YWN0Jyxcblx0XHRcdFx0XHRcdG9uUmV0dXJuOiBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdFx0XHRcdGN0cmwuc2NvcGUuY29udGFjdHMudXBkYXRlKClcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iXX0=
