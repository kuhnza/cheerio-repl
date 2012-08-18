var argv = require('optimist').argv,
	cheerio = require('cheerio'),
	repl = require('repl'),
	request = require('./request').request
	CookieJar = require('./request').CookieJar;

function usage() {
	console.log("Usage: node shell.js URL \n\n" + 
		"Global objects available inside the shell:\n" +
		"  $ = cheerio parsed DOM object\n" +
		"  html = raw html returned from URL\n" +
		"  res = raw response object returned from URL");
	process.exit(1);
}

if (argv.h || argv.help || argv._.length < 1) {
	usage();
}

var cookieJar = new CookieJar();
request(argv._[0], {
	cookieJar: cookieJar,
	complete: function(err, body, res) {
		if (err) { throw err; }		

		var context = repl.start("cheerio> ", null, null, null, true).context;
		context.res = res;
		context.html = body;
		context.$ = cheerio.load(body); 
	}
});

