'use babel';

let shell = require('shell');

//from http://stackoverflow.com/a/6969486/806777
function escapeRegExp(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function getHyperlink(textEditor, range) {
	var token = textEditor.tokenForBufferPosition(range.start);
	var hyperlink = /^https?:\/\/.+/;

	if (token && token.value && hyperlink.test(token.value)) {
		return token.value;
	}
}

function getRange(textEditor, range, link) {
	var searchStart = [range.start.row, range.start.column - link.length];
	var searchEnd = [range.end.row, range.end.column + link.length];
	var searchRange = [searchStart, searchEnd];

	var linkRegexp = new RegExp(escapeRegExp(link));
	var linkRange = null;

	textEditor.scanInBufferRange(linkRegexp, searchRange, function (found) {
		linkRange = found.range;
		found.stop();
	});
	return linkRange;
}

module.exports = {
	getProvider() {
		return {
			providerName: 'hyperlink-hyperclick',
			getSuggestionForWord(textEditor, text, range) {
				var link = getHyperlink(textEditor, range);
				if (link) {
					var linkRange = getRange(textEditor, range, link);
					return {
						range: linkRange,
						callback() {
							shell.openExternal(link);
						},
					};
				}
			},
		};
	},
};
