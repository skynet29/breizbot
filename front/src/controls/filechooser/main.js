//@ts-check
$$.control.registerControl('breizbot.filechooser', {


	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'breizbot.files'],

	props: {
		filterExtension: '',
		getMP3Info: false,
		showMp3Filter: false
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.Files.Interface} filesSrv
	 */
	init: function (elt, pager, filesSrv) {

		const { filterExtension, getMP3Info, showMp3Filter } = this.props

		/**
		 * 
		 * @param {Breizbot.Controls.Files.Interface} iface 
		 */
		function openFilterPage(iface) {
			const mp3Filters = iface.getMP3Filters()
			const files = iface.getFiles()

			pager.pushPage('breizbot.filterDlg', {
				title: 'Filter',
				props: {
					files,
					mp3Filters
				},
				onReturn: function (filters) {
					//console.log('filters', filters)
					iface.setMP3Filters(filters)
				}
			})
		}

		/**
		 * 
		 * @param {string} title 
		 * @param {string} friendUser 
		 */
		function openFilePage(title, friendUser) {
			const options = {
				title,
				/**@type {Breizbot.Controls.Files.Props} */
				props: {
					filterExtension,
					friendUser,
					getMP3Info
				},
				events: {
					/**
					 * 
					 * @param {Breizbot.Controls.Files.EventData.FileClick} info 
					 */
					fileclick: function (ev, info) {
						//console.log('fileclick', info)
						const { rootDir, fileName, mp3 } = info
						const url = filesSrv.fileUrl(rootDir + fileName, friendUser)
						pager.popPage({url, mp3, fileName})

					}
				},
				onReturn: function (url) {
					pager.popPage(url)
				}
			}
			if (showMp3Filter) {
				options.buttons = {
					search: {
						title: 'Filter',
						icon: 'fas fa-filter',
						onClick: function () {
							openFilterPage(fileCtrl)
						}
					}

				}
			}
			const fileCtrl = pager.pushPage('breizbot.files', options)

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
						onReturn: function (data) {
							pager.popPage(data)
						}
					})
				}

			}
		})

	}


});




