$$.control.registerControl('breizbot.friends', {

	props: {
		showSelection: false
	},

	deps: ['breizbot.users'],

	template: {gulp_inject: './friends.html'},

	init: function(elt, users) {

		const {showSelection} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				friends: []
			},
			events: {
				onItemClick: function() {
					const userName =  $(this).data('item')
					//console.log('onItemClick', userName)
					if (showSelection) {
						$(this).siblings('.w3-blue').removeClass('w3-blue')
						$(this).addClass('w3-blue')						
					}
					elt.trigger('friendclick', {userName})
				}
			}
		})	

		this.getSelection = function() {
			return elt.find('li.w3-blue').data('item')
		}

		this.getFriends = function() {
			return ctrl.model.friends
		}

		function updateFriends() {
			users.getFriends().then((friends) => {
				console.log('friends', friends)
				ctrl.setData({friends})
			})				
		}


		updateFriends()

	},

	$iface: `
		getSelection():string;
		getFriends():[string]
	`,

	$events: 'friendclick'
});




