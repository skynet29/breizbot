//@ts-check
$$.control.registerControl('FileChoice', {


	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'breizbot.files'],

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.Files.Interface} filesSrv
	 */
	init: function (elt, pager, filesSrv) {

		/**
		 * 
		 * @param {string} title 
		 * @param {string} friendUser 
		 */
		function openFilePage(title, friendUser) {
			pager.pushPage('breizbot.files', {
				title,
				/**@type {Breizbot.Controls.Files.Props} */
				props: {
					filterExtension: 'mp4',
					friendUser
				},
				events: {
					/**
					 * 
					 * @param {Breizbot.Controls.Files.EventData.FileClick} info 
					 */
					fileclick: function (ev, info) {
						console.log('fileclick', info)
						const { rootDir, fileName } = info
						const url = filesSrv.fileUrl(rootDir + fileName, friendUser)
						pager.popPage(url)

					}
				},
				onReturn: function (url) {
					pager.popPage(url)
				}
			})

		}

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onHome: function () {
					openFilePage('Home files', '')
				},
				onShare: function () {
					pager.pushPage('breizbot.friends', {
						title: 'Shared files',
						/**@type {Breizbot.Controls.Friends.Props} */
						props: {
							showConnectionState: false
						},
						events: {
							/**
							 * 
							 * @param {Breizbot.Controls.Friends.EventData.FriendClick} data 
							 */
							friendclick: function (ev, data) {
								//console.log('onSelectFriend', data)
								const { userName } = data
								openFilePage(userName, userName)
							}
						},
						onReturn: function (url) {
							pager.popPage(url)
						}
					})
				}

			}
		})

	}


});




