
$(function() {

	let routes = [
		{href: '/', redirect: '/controls'},
		{href: '/controls', control: '$controls'},
		{href: '/services', control: '$services'},
		{href: '/controls/:name', control: '$control.details'}

	]

	$$.viewController('#main', {
		data: {
			routes
		}
	})
});
