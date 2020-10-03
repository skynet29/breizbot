$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['breizbot.rtc'],

	init: function(elt, rtc) {

		const whiteSquareGrey = '#a9a9a9'
		const blackSquareGrey = '#696969'		

		let game = new Chess()

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


		const ctrl = $$.viewController(elt, {
			data: {
				yourTurn: false,
				message: ''				
			},
			events: {
				onHangup: function(ev) {
					board.clear()
					game = new Chess()
					removeHighlights('black')
					removeHighlights('white')
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


		rtc.on('accept', function() {
			board.orientation('white')
			board.start()
			ctrl.setData({yourTurn: true})
			updateStatus()

		})


		rtc.onData('chess', function(data) {
			const {source, target} = data

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

		rtc.on('bye', function(msg) {
			game = new Chess()
			board.clear()
			removeHighlights('black')
			removeHighlights('white')			

		})			

		rtc.on('ready', () => { 
			if (rtc.isCallee()) {
				board.orientation('black')
				board.start()
				rtc.accept()				
			}			
		})

		this.onAppExit = function() {
			return rtc.exit()
		}		


	}


});




