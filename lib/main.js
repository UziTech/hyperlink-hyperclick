'use strict';
var shell = require('shell');
// var validChar = /[^ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789\-\.\_~:\/\?#\[\]@!\$&'\(\)\*\+,;=]/;
// function debug() {
// 	var args = Array.prototype.slice.call(arguments);
// 	atom.notifications.addInfo(args.reduce(function (prev, val) {
// 		return prev + " " + val;
// 	}, ""));
// }

function getHyperlink(textEditor, range) {
	var token = textEditor.tokenForBufferPosition(range.start);
	var hyperlink = /^https?:\/\/.+/;

	if (token && token.value && hyperlink.test(token.value)) {
		return token;
	}
}

function getRange(textEditor, range, token) {
	return range;
}

module.exports = {
	getProvider: function () {
		return {
			providerName: 'hyperlink-hyperclick',
			getSuggestionForWord: function (textEditor, text, range) {
				var linkToken = getHyperlink(textEditor, range);
				if (linkToken) {
					var linkRange = getRange(textEditor, range, linkToken);
					return {
						range: linkRange,
						callback: function () {
							shell.openExternal(linkToken.value);
						}
					};
				}
			}
		};
	}
};
