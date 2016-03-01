"use strict";

const fs           = require('fs');
const path         = require('path');
const chokidar     = require('chokidar');
const less         = require('less');
const sass         = require('node-sass');
const browserSync  = require("browser-sync");
const autoprefixer = require('autoprefixer');
const postcss      = require('autoprefixer/node_modules/postcss');

class task {
	constructor(nowDirPath, watchPath) {
		this.nowDirPath = nowDirPath;
		this.targetFilePath = nowDirPath+'\\'+watchPath;
		this.targetDirPath = path.dirname(this.targetFilePath)+'\\';
		this.targetFileName_Ext = path.basename(this.targetFilePath);
		this.targetFileExt = path.extname(this.targetFileName_Ext);
		this.targetFileName = path.basename(this.targetFileName_Ext, this.targetFileExt);
		this.css;
		this.map;
	}

	//sass実行
	run_sass(){
		var result = sass.renderSync({
	//	data: css,
		file: this.targetFilePath,
		outFile: './',
		outputStyle: 'compressed',
		sourceMap: true,
		sourceMapEmbed: true
		});
		this.css = result.css.toString();
		this.map = result.map.toString();
		this.run_autoprefixer();
// 			this.run_make_file();
	}

	//less実行
	run_less(){
		less.render(this.css, {sourceMap: {sourceMapFileInline: true}, filename: this.targetFileName_Ext, compress: true}).then( function (output) {
			this.css = output.css;
			this.run_autoprefixer();
		});
	}

	//autoprefixer実行
	run_autoprefixer(){
			this.run_make_file();
		postcss([autoprefixer({browsers:['last 3 versions','ie >= 9','iOS >= 6','Android >= 3']})]).process(this.css, {from: this.targetFileName_Ext, map:{prev:this.map}}).then(function (result) {
			result.warnings().forEach(function (warn) {
				console.warn(warn.toString());
			});
			this.css = result.css;
		});
	}

	//browsersync実行
	run_browsersync(){

	}

	//ファイルの書き出し
	run_make_file(){
// 		console.log(this.nowDirPath+'\\fewf.css');
		console.log('run_make_file');
		fs.writeFile(this.targetDirPath+this.targetFileName+'.css', this.css);
	}
}

var nowDirPath = path.normalize(path.dirname(process.argv[1]));
var count = 0;


var watch = chokidar.watch('.', {ignored: /[\/\\]\./});
watch.on('change', (watchFilePath, data) => {

	count++;
	var work = new task(nowDirPath, watchFilePath);

	if(work.targetFileExt==='.scss' || work.targetFileExt==='.sass'){
		work.run_sass();
	  setTimeout(function(){
	//   	console.log(--count);
// 		  console.log('Fire');
// 		  work.run_make_file();
	  },1000);
	}

});
