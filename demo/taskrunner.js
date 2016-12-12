const tr = require('taskrunner');

//Browsersyncの起動
const browserSync = tr.browserSync({
//	server: {
//		baseDir: "./",
//		directory: true
//	},
	proxy: 'localhost:8081',
	ghostMode: false,
	open: false
});

//Electronの起動
const electron = require('electron-connect').server.create();
electron.start();

//ファイルを監視
tr.watcher(null, null, function(watchFilePath){

	//変更ファイルを解析
	const build = new tr.build(watchFilePath);

	//xxx.sassまたはxxx.scssから、xxx.cssを作成
	if(build.match('**/*.(scss|sass)')){
		build.runSass();
	}

	//xxx.lessから、xxx.cssを作成
	if(build.match('**/*.less')){
		build.runLess();
	}

	//xxx.es6から、xxx.jsを作成
	if(build.match('**/*.es6')){
		build.runBable();
	}

	//webpack.jsから、bundle.jsを作成
	if(build.match('**/*webpack.js')){
		build.runWebpack();
	}

	//xxx.tagから、xxx.jsを作成
	if(build.match('**/*.tag')){
		build.runRiot();
	}

	//ブラウザをリロード
	if(build.match('**/*.(html|css|php|js|jpg|png|gif|svg)')){
		browserSync.reload(build.targetFileName_Ext);
	}

	//Electronをリロード
	if(build.match('**/main.js')){
		electron.restart();
	}
	if(build.match('**/*.(html|css|php|js|jpg|png|gif|svg)')){
		electron.reload();
	}

});
