$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	props: {
		$pager: null
	},

	deps: ['breizbot.rtc', 'breizbot.broker', 'breizbot.params'],

	init: function(elt, rtc, broker, params) {

		const {$pager} = this.props

		const whiteSquareGrey = '#a9a9a9'
		const blackSquareGrey = '#696969'		

		const game = new Chess()

		const board = Chessboard('myBoard', {
			draggable: true,
			pieceTheme: function(pieceCode) {
				return `/webapps/chess/assets/img/chesspieces/wikipedia/${pieceCode}.png`
			},

			onDragStart: function(source, piece, position, orientation) {
				if (game.game_over()) return false

				if (!ctrl.model.yourTurn) {
					return false
				}
				if ((orientation === 'white' && piece.search(/^w/) === -1) ||
				  (orientation === 'black' && piece.search(/^b/) === -1)) {
					return false
				}

				showLegalMoves(source)
			},

			onDrop: function(source, target, piece, newPos, oldPos, orientation) {
			  removeGreySquares()

			  const move = game.move({
			    from: source,
			    to: target,
			    promotion: 'q' // NOTE: always promote to a queen for example simplicity
			  })

			  // illegal move
			  if (move === null) return 'snapback'

			  if (source != target) {
				  rtc.sendData('chess', {source, target})
				  ctrl.setData({yourTurn: false})
				  updateStatus()	
				  removeHighlights('white')
				  $board.find('.square-' + source).addClass('highlight-white')
				  $board.find('.square-' + target).addClass('highlight-white')				  		  	
			  }

			}

		})	

		function showLegalMoves(square) {
			if (!ctrl.model.yourTurn) {
				return
			}
			const moves = game.moves({
			  square,
			  verbose: true
			})

			// exit if there are no moves available for this square
			if (moves.length === 0) return

			// highlight the square they moused over
			greySquare(square)

			// highlight the possible squares for this piece
			for (let i = 0; i < moves.length; i++) {
			  greySquare(moves[i].to)
			}			
		}	

		const data = {
			status: 'ready',
			distant: '',
			yourTurn: false,
			message: ''
		}

		if (params.caller != undefined) {
			data.status = 'connected'
			data.distant = params.caller
			rtc.setRemoteClientId(params.clientId)
			board.orientation('black')
			board.start()
		}

		const ctrl = $$.viewController(elt, {
			data,
			events: {
				onCall: function(ev) {
					console.log('onCall')

					$pager.pushPage('friendsPage', {
						title: 'Select a friend to play with'
					})

				},
				onCancel: function(ev) {
					rtc.cancel(ctrl.model.distant)
					.then(() => {
						ctrl.setData({status: 'canceled', distant: ''})
					})
					.catch((e) => {
						$$.ui.showAlert({title: 'Error', content: e.responseText})
					})
				},
				onHangup: function(ev) {
					rtc.bye()
					ctrl.setData({status: 'ready', distant: '', messages: []})
				}

			}
		})
		const $board = ctrl.scope.board

		function removeHighlights (color) {
			const className = 'highlight-' + color
		  	$board.find('.' + className).removeClass(className)
		}


		function removeGreySquares () {
		  $('#myBoard .square-55d63').css('background', '')
		}

		function greySquare (square) {
		  var $square = $('#myBoard .square-' + square)

		  var background = whiteSquareGrey
		  if ($square.hasClass('black-3c85d')) {
		    background = blackSquareGrey
		  }

		  $square.css('background', background)
		}		

		function updateStatus () {
		  var status = ''

		  var moveColor = 'White'
		  if (game.turn() === 'b') {
		    moveColor = 'Black'
		  }

		  // checkmate?
		  if (game.in_checkmate()) {
		    status = 'Game over, ' + moveColor + ' is in checkmate.'
		  }

		  // draw?
		  else if (game.in_draw()) {
		    status = 'Game over, drawn position'
		  }

		  // game still on
		  else {
		    status = moveColor + ' to move'

		    // check?
		    if (game.in_check()) {
		      status += ', ' + moveColor + ' is in check'
		    }
		  }
		  ctrl.setData({message: status})
		}

		updateStatus()

		this.onReturn = function(userName) {
			//console.log('onReturn', userName)
			if (userName == undefined) {
				return
			}
			
			rtc.call(userName, 'chess', 'fa fa-chess')
			.then(() => {
				ctrl.setData({status: 'calling', distant: userName})
			})
			.catch((e) => {
				$$.ui.showAlert({title: 'Error', content: e.responseText})
			})
		}	

		broker.onTopic('breizbot.rtc.accept', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			rtc.cancel(ctrl.model.distant)
			rtc.setRemoteClientId(msg.srcId)
			ctrl.setData({status: 'connected', yourTurn: true})
			board.start()

		})

		broker.onTopic('breizbot.rtc.deny', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			ctrl.setData({status: 'refused'})
			rtc.cancel(ctrl.model.distant)

		})	

		broker.onTopic('breizbot.rtc.chess', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			const {source, target} = msg.data

			board.move(`${source}-${target}`)
			ctrl.setData({yourTurn: true})
			game.move({
			  from: source,
			  to: target,
			  promotion: 'q' // NOTE: always promote to a queen for example simplicity
			})	
			removeHighlights('black')
			$board.find('.square-' + source).addClass('highlight-black')
			$board.find('.square-' + target).addClass('highlight-black')						
			updateStatus()		
		
		})		

		broker.onTopic('breizbot.rtc.bye', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			ctrl.setData({status: 'disconnected', distant: '', messages: []})

		})			

		broker.on('ready', (msg) => { 
			rtc.setLocalClientId(msg.clientId)
			if (params.caller != undefined) {
				rtc.accept()				
			}			
		})

		window.onbeforeunload = function() {
			if (ctrl.model.status == 'connected') {
		  		rtc.bye()
			}
	
		}	

	}


});




