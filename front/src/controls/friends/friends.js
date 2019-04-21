$$.control.registerControl('breizbot.friends', {

	props: {
		showSelection: false,
		showSendMessage: false
	},

	deps: ['breizbot.users'],

	template: {gulp_inject: './friends.html'},

	init: function(elt, users) {

		const {showSelection, showSendMessage} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				friends: [],
				showSendMessage
			},
			events: {
				onItemClick: function() {
					const userName =  $(this).data('item')
					console.log('onItemClick', userName)
					if (showSelection) {
						$(this).siblings('.w3-blue').removeClass('w3-blue')
						$(this).addClass('w3-blue')						
					}
					elt.trigger('friendclick', {userName})
				},
				onSendMessage: function(ev) {
					ev.stopPropagation()
					const userName =  $(this).closest('li').data('item')
					console.log('onSendMessage', userName)
					$$.ui.showPrompt({title: 'Send Message', label: 'Message:'}, function(text) {
						users.sendNotif(userName, {text, reply: true})
					})
				}
			}
		})	

		this.getSelection = function() {
			return elt.find('li.w3-blue').data('item')
		}

		this.getFriends = function() {
			return ctrl.model.friends.map((friend) => friend.friendUserName)
		}

		this.update = function() {
			users.getFriends().then((friends) => {
				console.log('friends', friends)
				ctrl.setData({friends})
			})				
		}


		this.update()

	},

	$iface: `
		getSelection():string;
		getFriends():[string]
	`,

	$events: 'friendclick'
});




