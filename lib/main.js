'use strict';
var shell = require('shell');

module.exports = {
	getProvider: function () {
		return {
			providerName: 'hyperlink-hyperclick',
			getSuggestionForWord: function (textEditor, text, range) {
				return {
					range: range,
					callback: function () {
						shell.openExternal(text);
					}
				};
			},
			wordRegExp: /^https?:\/\/.+/
		};
	}
};
