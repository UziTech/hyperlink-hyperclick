'use strict';
var shell = require('shell');

module.exports = {
	getProvider: function () {
		return {
			providerName: 'hyperlink-hyperclick',
			getSuggestionForWord: function (textEditor, text, range) {
				if (/^https?:\/\/.+/.test(text)) {
					return {
						range: range,
						callback: function () {
							shell.openExternal(text);
						}
					};
				}
			},
			wordRegExp: /^https?:\/\/.+/ // FIXME: not sure why this isn't working
		};
	}
};
