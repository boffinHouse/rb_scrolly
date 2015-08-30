var readline = require('readline');
var fs = require('fs');

var options = {
	js: true
};
var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

var write = function(file){
	fs.readFile(file, 'utf8', function(err, data) {
		if (err) {
			return console.log(err);
		}
		var result = data.replace(/boilerplate/g, options.name).replace(/Boilerplate/g, options.upperCaseName);

		fs.writeFile(file, result, 'utf8', function (err) {
			var newName;
			if(err){
				console.log(err);
				return;
			}


			newName = file.replace(/boilerplate/g, options.name).replace(/Boilerplate/g, options.upperCaseName);
			if(file != newName){
				fs.rename(file, newName, function(er){
					if(er){
						console.log(er)
					}
				});
			}
		});
	});
};

var writeAll = function(){


	['sources/assemble/partials/_blocks/rb_boilerplate.hbs',
		'README.md',
		'package.json',
		'sources/assemble/data/rb_boilerplate.json',
		'sources/js/modules/rb_boilerplate.js',
		'sources/sass/_blocks/_rb_boilerplate.scss',
		'component-helpers/assemble/layouts/default_tpl.hbs',
		'component-helpers/assemble/pages/index.hbs',
		'component-helpers/sass/styles_config.scss',
		'component-helpers/sass/styles_config.scss',
		'tests/intern.js',
		'tests/unit/boilerplate.js',
	].forEach(write);
};

rl.question('Name of your project: ', function(name) {
	options.name = name;
	options.upperCaseName = options.name.charAt(0).toUpperCase() + options.name.substr(1);

	writeAll();
	rl.close();
});






