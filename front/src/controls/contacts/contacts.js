$$.control.registerControl('breizbot.contacts', {

	deps: ['breizbot.users'],

	props: {
		showSelection: false,
		showDeleteButton: false
	},	

	template: {gulp_inject: './contacts.html'},

	init: function(elt, users) {

		const {showSelection, showDeleteButton} = this.props


		const ctrl = $$.viewController(elt, {
			data: {
				contacts: [],
				showDeleteButton,
				show1: function() {
					return this.contacts.length > 0
				},
				show2: function() {
					return this.contacts.length == 0
				}
			},
			events: {
				onItemClick: function() {
					const data =  $(this).data('item')
					console.log('onItemClick', data)
					if (showSelection) {
						//$(this).siblings('.w3-blue').removeClass('w3-blue')
						$(this).toggleClass('w3-blue')						
					}
					elt.trigger('contactclick', data)					
				},

				onDeleteItem: function(ev) {
					ev.stopPropagation()
					const data =  $(this).closest('li').data('item')
					console.log('onDeleteItem', data)
					users.removeContact(data._id).then(load)

				}
			}
		})	

		function load() {
			users.getContacts().then((contacts) => {
				console.log('contacts', contacts)
				ctrl.setData({contacts})
			})	

		}

		load()

		this.update = load

		this.getSelection = function() {
			const ret = []
			elt.find('li.w3-blue').each(function() {
				ret.push($(this).data('item'))
			})
			console.log('ret', ret)
			return ret
		}

	}
});




