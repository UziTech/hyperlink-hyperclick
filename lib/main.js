/** @babel */

const {shell} = require("electron");
const {CompositeDisposable} = require("atom");

function escapeRegExp(str) {
	return str.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function uriRegExp(protocols) {
	const n0_f = "[0-9a-f]";
	const n0_255 = "(?:[0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])";
	const n1_65535 = "(?:[1-9]|[1-9][0-9]{1,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])";

	const prctEncode = `%${n0_f}{2}`;
	const chars = "[-a-z0-9._~!$&'*+,;=:@/?]";
	const charsNoQ = chars.replace(/[?]/g, "");
	const charsNoAt = chars.replace(/[@/?]/g, "");
	const charsNoColon = chars.replace(/[:/?]/g, "");

	const prcteAndChars = `(?:${prctEncode}|${chars})`;
	const prcteAndCharsNoQ = `(?:${prctEncode}|${charsNoQ})`;
	const prcteAndCharsNoAt = `(?:${prctEncode}|${charsNoAt})`;
	const prcteAndCharsNoColon = `(?:${prctEncode}|${charsNoColon})`;

	const validChars = `(?:${prcteAndChars}|\\(${prcteAndChars}*\\))`;
	const validCharsNoQ = `(?:${prcteAndCharsNoQ}|\\(${prcteAndCharsNoQ}*\\))`;

	const ipv4 = `${n0_255}(?:\\.${n0_255}){3}`;
	const ipv6 = "[0-9a-f:.]+";
	const ipvFuture = `v${n0_f}+${charsNoAt}+`;
	const ipAddress = `\\[(?:${ipv6}|${ipvFuture})\\]|${ipv4}`;

	const scheme = protocols.length > 0
		? `(?:${protocols.map(escapeRegExp).join("|")})`
		: "[a-z](?:[-a-z0-9+.])*";

	const auth = `(?:${prcteAndCharsNoAt}*@)`;
	const domain = `(?:${ipAddress}|${prcteAndCharsNoColon}+)`;
	const port = `(?::${n1_65535})`;
	const path = `(?:${validCharsNoQ}*)`;

	const query = `(?:\\?${validChars}*)`;
	const hash = `(?:#${validChars}*)`;

	const url = `//${auth}?${domain}${port}?${path}?${query}?${hash}?`;
	const email = `${auth}${domain}${query}?`;

	const regex = `\\b${scheme}:(?:${url}|${email})`;

	return new RegExp(regex, "i");
}

function matchHyperlink(text, protocols, col = 0) {
	const regex = uriRegExp(protocols);
	// FIXME: we could limit text length to prevent redos
	const match = text.match(regex);
	if (!match || match.index > col) {
		return null;
	}
	if (match.index === col) {
		return match[0];
	}
	const nextStart = text.indexOf(":") + 1;
	const nextMatch = matchHyperlink(text.substring(nextStart), protocols, col - nextStart);
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
			description: "Comma separated list of protocols to match (Default=Any Protocol)",
			type: "array",
			default: [],
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
