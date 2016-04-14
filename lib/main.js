"use babel";

const shell = require("shell");

// from http://stackoverflow.com/a/6969486/806777
function escapeRegExp(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function isHyperlink(link) {
	return /^https?:\/\/.+/.test(link);
}

function getHyperlink(textEditor, range) {
	const token = textEditor.tokenForBufferPosition(range.start);

	if (token && token.value) {
		const linkText = token.value.trim();
		if (isHyperlink(linkText)) {
			return {
				link: linkText,
				linkText,
			};
		} else if (textEditor.getGrammar().scopeName === "source.gfm") {
			let link = null;
			mdLinkRegex = new RegExp("^\\s*\\[" + escapeRegExp(linkText) + "\\]\\s*:\\s*(\\S+)\\s*$", "ig");
			textEditor.getBuffer().backwardsScan(mdLinkRegex, (found) => {
				const matchedLink = found.match[1];
				if (isHyperlink(matchedLink)) {
					link = matchedLink;
					found.stop();
				}
			});
			if (link) {
				return {
					link,
					linkText,
				};
			}
		}
	}
}

function getRange(textEditor, range, linkText) {
	const searchStart = [range.start.row, range.start.column - linkText.length];
	const searchEnd = [range.end.row, range.end.column + linkText.length];
	const searchRange = [searchStart, searchEnd];

	const linkRegexp = new RegExp(escapeRegExp(linkText));
	let linkRange = null;

	textEditor.scanInBufferRange(linkRegexp, searchRange, (found) => {
		linkRange = found.range;
		found.stop();
	});
	return linkRange;
}

module.exports = {
	getProvider() {
		return {
			providerName: "hyperlink-hyperclick",
			getSuggestionForWord(textEditor, text, range) {

				const {
					link,
					linkText
				} = getHyperlink(textEditor, range);
				if (link) {
					const linkRange = getRange(textEditor, range, linkText);
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
