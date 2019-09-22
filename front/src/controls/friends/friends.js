$$.control.registerControl('breizbot.friends', {

	props: {
		showSelection: false,
		showSendMessage: false,
		showConnectionState: true
	},

	deps: ['breizbot.users', 'breizbot.broker'],

	template: {gulp_inject: './friends.html'},

	init: function(elt, users, broker) {

		const {showSelection, showSendMessage, showConnectionState} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				friends: [],
				showSendMessage,
				showConnectionState,
				show1: function() {
					return this.friends.length > 0
				},
				show2: function() {
					return this.friends.length == 0
				},
				class1: function() {
					const $i = this.$i
					const showConnectionState = this.showConnectionState
					return {
						'w3-text-green': $i.isConnected && showConnectionState,
						'w3-text-red': !$i.isConnected && showConnectionState,
						'w3-text-blue': !showConnectionState
					}
				}
			},
			events: {
				onItemClick: function() {
					const userName =  $(this).data('item').friendUserName
					//console.log('onItemClick', userName)
					if (showSelection) {
						$(this).siblings('.w3-blue').removeClass('w3-blue')
						$(this).addClass('w3-blue')						
					}
					elt.trigger('friendclick', {userName})
				},
				onSendMessage: function(ev) {
					ev.stopPropagation()
					const userName =  $(this).closest('li').data('item').friendUserName
					//console.log('onSendMessage', userName)
					$$.ui.showPrompt({title: 'Send Message', label: 'Message:'}, function(text) {
						users.sendNotif(userName, {text, reply: true})
					})
				}
			}
		})	

		function onUpdate(msg) {
			//console.log('msg', msg)
			if (msg.hist === true) {
				return
			}
			const {isConnected, userName} = msg.data
			const info = ctrl.model.friends.find((friend) => {return friend.friendUserName == userName})
			info.isConnected = isConnected
			ctrl.update()

		}
		broker.register('breizbot.friends', onUpdate)

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

		this.dispose = function() {
			console.log('[friends] dispose')
			broker.unregister('breizbot.friends', onUpdate)
		}


		this.update()

	},

	$iface: `
		getSelection():string;
		getFriends():[string]
	`,

	$events: 'friendclick'
});




