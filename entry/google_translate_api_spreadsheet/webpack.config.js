var path 				= require('path');
var webpack 			= require('webpack');

module.exports = {
	entry: ["./src/main.js"],
	output: {
		filename: "main.js",
	},
	resolve : {
		extensions 	: ['.js'],
		modules		: ["node_modules"],
	},
};
