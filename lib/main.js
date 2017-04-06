"use babel";
/* globals atom */

const shell = require("shell");
const {
	CompositeDisposable
} = require("atom");

function escapeRegExp(str) {
	return str.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function isHyperlink(link, protocols) {
	const protocolsEscaped = protocols.map((val) => {
		return escapeRegExp(val);
	});
	const protocolRegexp = new RegExp("^(" + protocolsEscaped.join("|") + ")://\\S+");
	return protocolRegexp.test(link);
}

function getHyperlink(textEditor, range, protocols) {
	const token = textEditor.tokenForBufferPosition(range.start);

	if (token && token.value) {
		const linkText = token.value.trim();
		if (isHyperlink(linkText, protocols)) {
			return {
				link: linkText,
				linkText,
			};
		} else if (textEditor.getGrammar().scopeName === "source.gfm") {
			let link = null;
			const mdLinkRegexp = new RegExp("^\\s*\\[" + escapeRegExp(linkText) + "\\]\\s*:\\s*(\\S+)\\s*$", "ig");
			textEditor.getBuffer().backwardsScan(mdLinkRegexp, (found) => {
				const matchedLink = found.match[1];
				if (isHyperlink(matchedLink, protocols)) {
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
			default: ["http", "https", "mailto"],
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
			providerName: "hyperlink-hyperclick",
			priority: atom.config.get("hyperlink-hyperclick.priority"),
			getSuggestionForWord: (textEditor, text, range) => {
				const {
					link,
					linkText
				} = getHyperlink(textEditor, range, this.protocols);
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
