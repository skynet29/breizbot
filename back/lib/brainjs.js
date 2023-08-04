//@ts-check

module.exports = function(libName, scripts, styles) {
	if (libName.includes('map')) {
		scripts.push('/brainjs/brainjs-map.js')
		styles.push('/brainjs/map/brainjs-map.css')
	}

	if (libName.includes('map-editor')) {
		scripts.push('/brainjs/brainjs-map-editor.js')
		styles.push('/brainjs/map/brainjs-map-editor.css')
	}

	if (libName.includes('tree')) {
		scripts.push('/brainjs/brainjs-tree.js')
		styles.push('/brainjs/tree/brainjs-tree.css')
	}

	if (libName.includes('circularmenu')) {
		scripts.push('/brainjs/brainjs-circularmenu.js')
		styles.push('/brainjs/css/brainjs-circularmenu.css')
	}

	if (libName.includes('milsymbol')) {
		scripts.push('/brainjs/brainjs-milsymbol.js')
	}

	if (libName.includes('flightpanel')) {
		scripts.push('/brainjs/brainjs-flightpanel.js')
	}

	if (libName.includes('pdf')) {
		scripts.push('/brainjs/brainjs-pdf.js')
	}

	if (libName.includes('audiopeakmeter')) {
		scripts.push('/brainjs/brainjs-audiopeakmeter.js')
	}

	if (libName.includes('blockly')) {
		scripts.push("/lib/blockly/blockly_compressed.js")
		scripts.push("/lib/blockly/blocks_compressed.js")
		scripts.push("/lib/blockly/msg/en.js")
		scripts.push('/lib/blockly/javascript_compressed.js')
	}
}