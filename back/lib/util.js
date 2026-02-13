//@ts-check

const simpleThumbnail = require('simple-thumbnail')
const { promisify } = require('util')
const imageSize = promisify(require('image-size'))
const path = require('path')
const fs = require('fs-extra')
const NodeID3 = require('node-id3')
const config = require('./config')
const ExifImage = require('exif').ExifImage
const fetch = require('node-fetch')
const querystring = require('querystring')

const https = require('https');
const { pipeline } = require('stream/promises');

const cloudPath = config.CLOUD_HOME

function getFilePath(user, filePath, friendUser) {
	let rootPath = path.join(cloudPath, user, filePath)
	if (friendUser != undefined && friendUser != '') {
		rootPath = path.join(cloudPath, friendUser, 'share', filePath)
	}
	return rootPath
}

/**
 * 
 * @param {string} fileName 
 * @returns 
 */
function isImage(fileName) {
	return (/\.(gif|jpg|jpeg|png|webp)$/i).test(fileName)
}

function genThumbnail(filePath, res, size) {
	return simpleThumbnail(filePath, res, size)
}

/**
 * @typedef {Object} Mp3Info
 * @property {string} genre
 * @property {string} artist
 * @property {string} title
 * @property {number} year
 * @property {number} length
 * @property {number} bpm
 */


/**
 * 
 * @param {string} filePath 
 * @returns {Promise<Mp3Info>}
 */
function readID3(filePath) {
	return new Promise(function (resolve, reject) {
		NodeID3.read(filePath, function (err, tags) {
			if (err) {
				reject(err)
			}

			delete tags.raw
			resolve(tags)
		})
	})

}

/**
 * 
 * @param {string} fileName 
 * @returns 
 */
function getExif(fileName) {
	return new Promise((resolve, reject) => {
		try {
			new ExifImage({ image: fileName }, function (error, exifData) {
				if (error)
					reject(error.message)
				else
					resolve(exifData)
			})
		}
		catch (e) {
			reject(e.message)
		}
	})
}



/**
 * @typedef {Object} FileInfo
 * @property {string} name
 * @property {boolean} folder
 * @property {number} size
 * @property {boolean} isImage
 * @property {number} mtime
 * @property {Mp3Info} [mp3]
 */

/**
 * 
 * @param {string} filePath 
 * @param {{getMP3Info?: boolean, getExifInfo?: boolean}} [options] 
 * @returns {Promise<FileInfo>}
 */
async function getFileInfo(filePath, options) {
	options = options || {}
	const statInfo = await fs.lstat(filePath)
	//console.log('statInfo', statInfo)
	let ret = {
		name: path.basename(filePath),
		folder: statInfo.isDirectory(),
		size: statInfo.size,
		isImage: isImage(filePath),
		mtime: statInfo.mtimeMs
	}

	if (!ret.folder && options.getMP3Info === true && filePath.toLowerCase().endsWith('.mp3')) {
		const tags = await readID3(filePath)

		ret.mp3 = tags
	}

	if (!ret.folder && options.getExifInfo === true && filePath.toLowerCase().endsWith('.jpg')) {
		try {
			const exifInfo = await getExif(filePath)
			ret.exif = exifInfo
		}
		catch (e) {
			console.log('ExifError', e)
		}
	}

	if (ret.isImage) {
		try {
			const dimension = await imageSize(filePath)
			//console.log('dimension', dimension)
			ret.dimension = dimension	
		}
		catch(e) {
			console.error('getFileInfo', e)
			ret.isImage = false
		}
	}

	//console.log('ret', ret)

	return ret

}

function getEncodedUrl(url, params) {
	return url + '?' + querystring.stringify(params)
}

/**
 * 
 * @param {string} theme 
 * @param {string} query 
 * @param {{count?: number, offset?: number}} [options] 
 * @returns 
 */
async function search(theme, query, options) {
	console.log('search', theme, options)
	const scraperapiKey = '36a62a3d7ef78359360098cfeba82c3d'

	options = options || {}
	const { count, offset } = options

	const params = {
		q: query,
		t: theme,
		//uiv: 4,
		locale: 'fr_FR'
	}

	if (count) {
		params.count = Math.min(count, 50)
	}

	if (offset) {
		params.offset = offset
	}

	const qwantUrl = getEncodedUrl(`https://api.qwant.com/v3/search/${theme}`, params)
	//console.log('qwantUrl', qwantUrl)

	const scraperapiParams = {
		api_key: scraperapiKey,
		url: qwantUrl
	}
	const url = getEncodedUrl('http://api.scraperapi.com', scraperapiParams)
	//console.log('url', url)

	const resp = await fetch(qwantUrl)
	const json = await resp.json()
	console.log('json', json)
	return json.data

}


function mergeArray(a, b) {
	return [...new Set([...a, ...b])] 
}

async function downloadFile(url, outputPath, onProgress = () => { }) {
	const response = await new Promise((resolve, reject) => {
		https.get(url, (res) => {
			if (res.statusCode !== 200) {
				reject(new Error(`HTTP ${res.statusCode}`));
			} else {
				resolve(res);
			}
		}).on('error', reject);
	});

	const totalSize = parseInt(response.headers['content-length'], 10) || null;
	let downloaded = 0;

	response.on('data', (chunk) => {
		downloaded += chunk.length;

		onProgress({
			downloaded,
			total: totalSize,
			percent: totalSize
				? (downloaded / totalSize) * 100
				: null
		});
	});

	await pipeline(
		response,
		fs.createWriteStream(outputPath)
	);
}



module.exports = {
	isImage,
	genThumbnail,
	getFileInfo,
	getFilePath,
	search,
	mergeArray,
	downloadFile
}