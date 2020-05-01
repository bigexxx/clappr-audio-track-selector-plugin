var path = require('path');

module.exports = {
	mode: 'none',
	entry    : path.resolve(__dirname, 'index.js'),
	externals: {
		clappr: {
			amd: 'clappr',
			commonjs: 'clappr',
			commonjs2: 'clappr',
			root: 'Clappr'
		}
	},
	module   : {
		rules: [
			{
				test: /\.js$/,
				loader: 'babel-loader',
				exclude: /node_modules/,
				query: {
					compact: true,
				}
			},
			{
				test: /\.scss$/,
				loaders: ['style-loader?singleton=true', 'css-loader', 'postcss-loader', 'sass-loader?includePaths[]='
				+ path.resolve(__dirname, './node_modules/compass-mixins/lib')
				+ '&includePaths[]='
				+ path.resolve(__dirname, './node_modules/clappr/src/base/scss')
				+ '&includePaths[]='
				+ path.resolve(__dirname, './src/base/scss')
				],
				include: path.resolve(__dirname, 'src'),
			},
			{
				test: /\.html/, loader: 'html-loader?minimize=false'
			},
		],
	},
	resolve: {
		modules: [
			path.resolve(__dirname, 'src'),
			'node_modules'
		],
		extensions: ['.js'],
	},
	output   : {
		path         : path.resolve(__dirname, 'dist'),
		publicPath   : '<%=baseUrl%>/',
		filename     : 'clappr-audio-track-selector.js',
		library      : 'AudioTrackSelector',
		libraryTarget: 'umd',
	},
};
