"use strict";

const fs   = require('fs');
const path = require('path');
const anymatch = require('anymatch');

const projectDirPath = path.normalize(path.dirname(process.argv[1]));

const message = function(message, color){
	const red     = '\u001b[31m';
	const green   = '\u001b[32m';
	const yellow  = '\u001b[33m';
	const blue    = '\u001b[34m';
	const magenta = '\u001b[35m';
	const cyan    = '\u001b[36m';
	const reset   = '\u001b[0m';
	switch (color){
		case 'red': color = red; break;
		case 'green': color = green; break;
		case 'yellow': color = yellow; break;
		case 'blue': color = blue; break;
		case 'magenta': color = magenta; break;
		case 'cyan': color = cyan; break;
		default: color = reset; break;
	}
	console.log('['+magenta+'TR'+reset+'] '+color+message+reset);
};

const extend = function(object1, object2){
	if(object2!=null){
		for(var key in object2){
			if(object2.hasOwnProperty(key)){
				object1[key] = object2[key];
			}
		}
	}
	return object1;
};

/**
 * ファイルを監視
 */
const watcher = function(paths, ignored, callback){
	message('Watch Start...', 'blue');
	if(!paths) paths = ['.']; //現在のフォルダを起点
	if(!ignored) ignored = [/[\/\\]\./, /^\.[^\/\\]/,/(node_modules|vender)/]; //.で始まるファイルとフォルダなどを除外
	const chokidar = require('chokidar');
	const watcher = chokidar.watch(paths, {ignored: ignored, awaitWriteFinish: {stabilityThreshold: 300}});
	watcher.on('change', (watchFilePath) => {
		try{
			callback(watchFilePath);
		}catch(e){
			const notifier = require('node-notifier');
			notifier.notify({
				title: 'TaskRunner',
				message: 'エラーが起きました。',
				sound: false,
				time: 5000,
				wait: false
			}, function(err, response){});
			message(e.toString(), 'red');
		}
	});
};

/**
 * フォルダを同期
 */
const syncFiles = function(source, target, opts){
	message('Sync:'+source+' to '+target, 'green');
	require('sync-files')(source, target, opts, function(e, file){
		if(e==='error'){
			message(e+':'+file, 'red');
		}
	});
};

/**
 * 
 * @type {build}
 */
const build = class {
	constructor(watchFilePath) {
		this.watchFilePath = watchFilePath;
		this.targetFilePath = projectDirPath+'\\'+watchFilePath;
		this.targetDirPath = path.dirname(this.targetFilePath)+'\\';
		this.targetFileName_Ext = path.basename(this.targetFilePath);
		this.targetFileExt = path.extname(this.targetFileName_Ext);
		this.targetFileName = path.basename(this.targetFileName_Ext, this.targetFileExt);
		this.code = '';
		this.map = '';
	}

	/**
	 * stylus実行
	 * 指定ファイルを読み込み、this.codeを上書き
	 */
	runStylus(opt){
		const self = this;
		opt = extend({
			minify: true,
			sourceMap: true,
		}, opt);
		const stylus = require('stylus');
		var css = fs.readFileSync(self.targetFilePath, 'utf8');
		stylus(css)
			.set('filename', self.targetFilePath)
			.set('sourcemap', opt.sourceMap?{inline:true}:false)
			.render(function(err, css){
				if (err) throw err;
				self.code = css;
				self.map = stylus.sourcemap;
				self.runAutoprefixer(opt);
			});
	}

	/**
	 * sass実行
	 * 指定ファイルを読み込み、this.codeを上書き
	 */
	runSass(opt){
		const self = this;
		opt = extend({
			minify: true,
			sourceMap: true,
		}, opt);
		// const sass = require('node-sass');
		const sass = require('sass');//dart-sassを使う
		var result = sass.renderSync({
		// data: code,
		file: this.targetFilePath,
		outFile: self.targetFileName_Ext,
		outputStyle: opt.minify ? 'compressed' : 'nested',
		sourceMap: true,
		// sourceMapEmbed: true
		});
		self.code = result.css.toString();
		self.map = result.map.toString();
		self.runAutoprefixer(opt);
	}

	/**
	 * less実行
	 * 指定ファイルを読み込み、this.codeを上書き
	 */
	runLess(opt){
		const self = this;
		opt = extend({
			minify: true,
			sourceMap: true,
		}, opt);
		fs.readFile(self.targetFilePath, 'utf8', function (err, css) {
			const less = require('less');
			less.render(css, {sourceMap: {}, filename: self.targetFileName_Ext, compress: opt.minify}).then( function (output) {
				self.code = output.css;
				self.map = output.map;
				self.runAutoprefixer(opt);
			});
		});
	}

	/**
	 * autoprefixer実行
	 * this.cssにプレフィックを付けてthis.codeを上書き
	 */
	runAutoprefixer(opt, unWrite){
		const self = this;
		opt = extend({
			minify: true,
			sourceMap: true,
		}, opt);
		const autoprefixer = require('autoprefixer');
		const mqpacker = require('css-mqpacker');
		const postcss = require('postcss');
		postcss([
			autoprefixer({overrideBrowserslist :['last 3 versions','ie >= 9','iOS >= 7','Android >= 4.1'], grid: 'autoplace'}),
			mqpacker
		]).process(self.code, {from: self.targetFileName_Ext, map: opt.sourceMap ? {prev:self.map, inline: true} : null}).then(function (result) {
//		]).process(self.code, {from: self.targetFileName_Ext, map: { inline: false }}).then(function (result) {
			result.warnings().forEach(function (warn) {
				message(warn.toString(), 'red');
			});
			self.code = result.css;
			if(unWrite!==true){
				self.runWrite('css');
			}
		});
	}

	/**
	 * riot実行
	 * xxx.tagを読み込みxxx.jsを作成
	 */
	runRiot(){
		const self = this;
		const riot = require('riot');
		riot.parsers.css.sass = function(tagName, css) {  
			const sass = require('node-sass');
		  const result = sass.renderSync({
		    data: css
		  });
		  return result.css.toString();
		};
		fs.readFile(self.targetFilePath, 'utf8', function (err, tag) {
			self.code = riot.compile(tag);
			self.runWrite('js');
		});
	}

	/**
	 * bable実行
	 * xxx.es6を読み込みxxx.jsを作成
	 */
	runBable(){
		const babel = require('babel-core');
		const result = babel.transformFileSync(this.targetFilePath, {
//			sourceMaps: 'inline',
			compact: true,
			comments: false
		});
		this.code = result.code;
		this.runWrite('js');
	}

	/**
	 * webpack実行
	 *
	 */
	runWebpack(){
		const webpack = require('webpack');
		const compiler = webpack({
			entry: './webpack.js',
			output: {
				filename: './bundle.js'
			}
		});
		compiler.run(function(err, stats) {
		});
	}

	/**
	 * ファイルの書き出し
	 * 指定ファイルと同じフォルダにファイルを作成
	 */
	runWrite(ext){
		if(projectDirPath.match('home_local_winscp')){
			var scp_file_path = this.targetDirPath.split(/scp\d{5}/);
			var dir_list = fs.readdirSync(scp_file_path[0]);
			var isFileExist = false;
			for(var i=0; i<dir_list.length; i++){
				if(fs.existsSync(scp_file_path[0]+dir_list[i]+scp_file_path[1]+path.sep+this.targetFileName+'.'+ext)){
					this.targetDirPath = scp_file_path[0]+dir_list[i]+scp_file_path[1]+path.sep;
					isFileExist = true;
				}
			}
			if(!isFileExist){
				message(this.targetFileName+'.'+ext+' is NotFound.', 'red');
				NotFound
//				throw new Error(this.targetFileName+'.'+ext+' is NotFound.');
//				return;
			}
		}
		var obj = this;
		fs.writeFile(this.targetDirPath+this.targetFileName+'.'+ext, this.code, function(err){
			if(err){
				throw err;
			}else{
				message('Build: '+obj.targetFileName+'.'+ext, 'green');
			}
		});
	}

	/**
	 * ファイルが当てはまるか調べる
	 */
	match(matchers){
		return anymatch(matchers, this.watchFilePath);
	}
};

module.exports = {
	build: build,
	watcher: watcher,
	message: message,
	syncFiles: syncFiles,
	browserSync: require("browser-sync")
};