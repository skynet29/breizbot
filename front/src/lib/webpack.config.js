// webpack.config.js

const path = require('path');

module.exports = {
  entry: {
    lexical: './src/lexical.js'
  },
  output: {
    filename: '[name].min.js',
    path: path.resolve(__dirname, 'js')
  },

  mode: process.env.NODE_ENV == 'production' ? 'production' : 'development'
}
