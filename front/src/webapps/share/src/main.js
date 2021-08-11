//@ts-check
$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['breizbot.pager', 'breizbot.files'],

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.Files.Interface} srvFiles 
	 */
	init: function(elt, pager, srvFiles) {

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onSelectFriend: function(ev, data) {
					//console.log('onSelectFriend', data)
					const {userName} = data
					pager.pushPage('breizbot.files', {
						title: userName,
						props: {
							friendUser: userName
						},
						events: {
							fileclick: function(ev, info) {
								const fullName = info.rootDir + info.fileName

								const type = $$.util.getFileType(info.fileName)
								if (type != undefined) {
									pager.pushPage('breizbot.viewer', {
										title: info.fileName,
										props: {
											type,
											url: srvFiles.fileUrl(fullName, userName)
										}
									})
								}					
			
							}
						}
					})
				}				
			}
		})	

	}
});




