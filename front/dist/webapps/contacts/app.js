$$.control.registerControl('addContactPage', {

	template: "<form bn-event=\"submit: onSubmit\" bn-form=\"from\">\n	<div bn-control=\"brainjs.inputgroup\">\n		<label>Name:</label><br>\n		<input type=\"text\" name=\"name\" style=\"min-width: 300px\" required=\"\" autofocus=\"\">	\n	</div>\n	<br>\n\n	<div bn-control=\"brainjs.inputgroup\">\n		<label>Email:</label><br>\n		<input type=\"email\" name=\"email\" style=\"min-width: 300px\" required=\"\">	\n	</div>	\n\n	<input type=\"submit\" bn-bind=\"submit\" hidden=\"\">\n</form>\n",

	deps: ['breizbot.users', 'breizbot.pager'],

	props: {
		from: {}
	},

	buttons: {
		add: {title: 'Add', icon: 'fa fa-user-plus'}
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

		this.onAction = function(cmd) {
			console.log('onAction', cmd)
			ctrl.scope.submit.click()
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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkZENvbnRhY3QuanMiLCJtYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYWRkQ29udGFjdFBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGZvcm0gYm4tZXZlbnQ9XFxcInN1Ym1pdDogb25TdWJtaXRcXFwiIGJuLWZvcm09XFxcImZyb21cXFwiPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHQ8bGFiZWw+TmFtZTo8L2xhYmVsPjxicj5cXG5cdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcIm5hbWVcXFwiIHN0eWxlPVxcXCJtaW4td2lkdGg6IDMwMHB4XFxcIiByZXF1aXJlZD1cXFwiXFxcIiBhdXRvZm9jdXM9XFxcIlxcXCI+XHRcXG5cdDwvZGl2Plxcblx0PGJyPlxcblxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHQ8bGFiZWw+RW1haWw6PC9sYWJlbD48YnI+XFxuXHRcdDxpbnB1dCB0eXBlPVxcXCJlbWFpbFxcXCIgbmFtZT1cXFwiZW1haWxcXFwiIHN0eWxlPVxcXCJtaW4td2lkdGg6IDMwMHB4XFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cdFxcblx0PC9kaXY+XHRcXG5cXG5cdDxpbnB1dCB0eXBlPVxcXCJzdWJtaXRcXFwiIGJuLWJpbmQ9XFxcInN1Ym1pdFxcXCIgaGlkZGVuPVxcXCJcXFwiPlxcbjwvZm9ybT5cXG5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnVzZXJzJywgJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0cHJvcHM6IHtcblx0XHRmcm9tOiB7fVxuXHR9LFxuXG5cdGJ1dHRvbnM6IHtcblx0XHRhZGQ6IHt0aXRsZTogJ0FkZCcsIGljb246ICdmYSBmYS11c2VyLXBsdXMnfVxuXHR9LFx0XG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCB1c2VycywgcGFnZXIpIHtcblxuXHRcdGNvbnN0IHtmcm9tfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZnJvbVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblN1Ym1pdDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRcdFx0Y29uc3QgZGF0YSA9ICQodGhpcykuZ2V0Rm9ybURhdGEoKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdkYXRhJywgZGF0YSlcblx0XHRcdFx0XHR1c2Vycy5hZGRDb250YWN0KGRhdGEubmFtZSwgZGF0YS5lbWFpbCkudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnY29udGFjdCBhZGRlZCAhJylcblx0XHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoKVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LmNhdGNoKChlcnIpID0+IHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6IGVyci5yZXNwb25zZVRleHR9KVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHR0aGlzLm9uQWN0aW9uID0gZnVuY3Rpb24oY21kKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnb25BY3Rpb24nLCBjbWQpXG5cdFx0XHRjdHJsLnNjb3BlLnN1Ym1pdC5jbGljaygpXG5cdFx0fVxuXG5cblxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cdDxidXR0b24gXFxuXHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCIgXFxuXHRcdHRpdGxlPVxcXCJBZGQgQ29udGFjdFxcXCJcXG5cdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkFkZENvbnRhY3RcXFwiXFxuXFxuXHQ+PGkgY2xhc3M9XFxcImZhIGZhLXVzZXItcGx1c1xcXCI+PC9pPjwvYnV0dG9uPlx0XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5jb250YWN0c1xcXCIgZGF0YS1zaG93LWRlbGV0ZS1idXR0b249XFxcInRydWVcXFwiIGJuLWlmYWNlPVxcXCJjb250YWN0c1xcXCI+PC9kaXY+XHRcXG48L2Rpdj5cXG5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQWRkQ29udGFjdDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQWRkQ29udGFjdCcpXG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2FkZENvbnRhY3RQYWdlJywge1xuXHRcdFx0XHRcdFx0dGl0bGU6ICdBZGQgQ29udGFjdCcsXG5cdFx0XHRcdFx0XHRvblJldHVybjogZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0XHRcdFx0XHRjdHJsLnNjb3BlLmNvbnRhY3RzLnVwZGF0ZSgpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblxuXG5cdH1cblxuXG59KTtcblxuXG5cblxuIl19
