const tr = require('taskrunner');

//Browsersync
const bs = tr.browserSync({
//	server: {
//		baseDir: "./",
//		directory: true
//	},
	proxy: 'localhost:8081',
	ghostMode: false,
	open: false
});

//ファイルを監視
const watcher = tr.watch();
watcher.on('change', (watchFilePath, data) => {

	//変更ファイルを解析
	const build = new tr.build(watchFilePath);

	//xxx.sassまたはxxx.scssから、xxx.cssを作成
	if(build.checkExt('.scss .sass')){
		build.runSass();
	}

	//xxx.lessから、xxx.cssを作成
	if(build.checkExt('.less')){
		build.runLess();
	}

	//xxx.es6から、xxx.jsを作成
	if(build.checkExt('.es6')){
		build.runBable();
	}

	//webpack.jsから、bundle.jsを作成
	if(build.targetFileName_Ext==='webpack.js'){
		build.runWebpack();
	}

	//ファイルの変更時、ブラウザをリロード
	if(build.checkExt('.html .css .php .js .jpg .png .gif .svg')){
		bs.reload(build.targetFileName_Ext);
	}else{
		tr.message('Change: '+build.targetFileName_Ext);
	}

});