'use strict';
var shell = require('shell');

module.exports = {
	getProvider: function () {
		return {
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
