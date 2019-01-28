/** @babel */

const shell = require("shell");
const {CompositeDisposable} = require("atom");

function escapeRegExp(str) {
	return str.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function matchHyperlink(text, protocols, col = 0) {
	const protocolsRegex = protocols.map((val) => {
		return escapeRegExp(val);
	}).join("|");
	const domainRegex = "\\w[\\w\\-]*\\w|\\w";
	const validChars = "-:@\\w.,~%+?=&#;|!";
	const hyperlinkRegexp = new RegExp(`\\b(?:${protocolsRegex})://(?:${domainRegex})(?:\\.(?:${domainRegex}))*(?:(?:/|\\?)(?:[${validChars}]|\\([${validChars}]*\\))*)*`);
	// FIXME: we should probably limit text length to prevent redos
	const match = text.match(hyperlinkRegexp);
	if (!match || match.index > col) {
		return null;
	}
	if (match.index === col) {
		return match[0];
	}
	const nextMatch = matchHyperlink(text.substring(match.index + 1), protocols, col - (match.index + 1));
	if (nextMatch) {
		return nextMatch;
	}
	if (match.index + match[0].length >= col) {
		return match[0];
	}
	return null;
}

function getHyperlink(textEditor, range, protocols) {
	const lineText = textEditor.lineTextForBufferRow(range.start.row);
	const matched = matchHyperlink(lineText, protocols, range.start.column);
	if (matched) {
		return {
			link: matched,
			linkText: matched,
		};
	} else if (textEditor.getGrammar().scopeName === "source.gfm") {
		const token = textEditor.tokenForBufferPosition(range.start);
		if (token && token.value) {
			const linkText = token.value.trim();
			let link = null;
			const mdLinkRegexp = new RegExp(`^\\s*\\[${escapeRegExp(linkText)}\\]\\s*:\\s*(\\S+)\\s*$`, "i");
			textEditor.getBuffer().backwardsScan(mdLinkRegexp, (found) => {
				link = matchHyperlink(found.match[1], protocols);
				if (link) {
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
	return {
		link: null,
		linkText: null,
	};
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
	config: {
		protocols: {
			description: "Comma separated list of protocols to open when ctrl+clicked",
			type: "array",
			default: ["http", "https", "mailto", "atom"],
			items: {
				type: "string",
			},
			order: 1,
		},
		priority: {
			description: "Set priority higher to avoid interference with other hyperclick plugins (Requires Restart)",
			type: "integer",
			default: 0,
			order: 2,
		},
	},
	activate() {
		this.subscriptions = new CompositeDisposable();
		this.subscriptions.add(atom.config.observe("hyperlink-hyperclick.protocols", (value) => {
			this.protocols = value;
		}));
	},
	deactivate() {
		this.subscriptions.dispose();
	},
	getProvider() {
		return {
			priority: atom.config.get("hyperlink-hyperclick.priority"),
			getSuggestionForWord: (textEditor, text, range) => {
				const {link, linkText} = getHyperlink(textEditor, range, this.protocols);
				if (!link) {
					return null;
				}
				const linkRange = getRange(textEditor, range, linkText);
				if (!linkRange) {
					return null;
				}
				return {
					range: linkRange,
					callback() {
						shell.openExternal(link);
					},
				};
			},
		};
	},
};
