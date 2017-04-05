"use babel";
/* global atom, waitsForPromise */
/* eslint-env jasmine */

const {
	Range
} = require("atom");
const shell = require("shell");
const {
	getSuggestionForWord
} = require("../lib/main.js").getProvider();

function callSuggestion(suggestion) {
	if (suggestion && suggestion.callback) {
		suggestion.callback();
	}
}

function checkRange(suggestion, range) {
	if (suggestion && suggestion.range) {
		return suggestion.range.isEqual(range);
	}
	return false;
}

describe("hyperlink-hyperclick", () => {
	let textEditor;

	beforeEach(() => {
		waitsForPromise(() => {
			return atom.packages.activatePackage("language-gfm");
		});

		waitsForPromise(() => {
			return atom.packages.activatePackage("language-hyperlink");
		});

		waitsForPromise(() => {
			return atom.packages.activatePackage("hyperlink-hyperclick");
		});

		waitsForPromise(() => {
			return atom.workspace.open("sample.md");
		});

		runs(() => {
			textEditor = atom.workspace.getActiveTextEditor();
			spyOn(shell, "openExternal");
		});
	});

	it("http is valid", () => {
		atom.config.set("hyperlink-hyperclick.protocols", ["http"]);
		textEditor.setText("<http://example.com>");
		const range = new Range([0, 1], [0, 2]);
		const suggestion = getSuggestionForWord(textEditor, null, range);
		callSuggestion(suggestion);

		expect(checkRange(suggestion, [[0, 1], [0, 19]])).toBe(true);
		expect(shell.openExternal).toHaveBeenCalled();
		expect(shell.openExternal.argsForCall[0][0]).toBe("http://example.com");
	});

	it("http is not valid", () => {
		atom.config.set("hyperlink-hyperclick.protocols", ["https"]);
		textEditor.setText("<http://example.com>");
		const range = new Range([0, 1], [0, 2]);
		const suggestion = getSuggestionForWord(textEditor, null, range);
		callSuggestion(suggestion);

		expect(shell.openExternal).not.toHaveBeenCalled();
	});

	it("any configured protocol is valid", () => {
		atom.config.set("hyperlink-hyperclick.protocols", ["test"]);
		textEditor.setText("test://example.com");
		const range = new Range([0, 0], [0, 1]);
		const suggestion = getSuggestionForWord(textEditor, null, range);
		callSuggestion(suggestion);

		expect(checkRange(suggestion, [[0, 0], [0, 18]])).toBe(true);
		expect(shell.openExternal).toHaveBeenCalled();
		expect(shell.openExternal.argsForCall[0][0]).toBe("test://example.com");
	});

	it("text is not valid", () => {
		atom.config.set("hyperlink-hyperclick.protocols", ["test"]);
		textEditor.setText("test");
		const range = new Range([0, 1], [0, 2]);
		const suggestion = getSuggestionForWord(textEditor, null, range);
		callSuggestion(suggestion);

		expect(shell.openExternal).not.toHaveBeenCalled();
	});

	it("gfm reference is valid", () => {
		atom.config.set("hyperlink-hyperclick.protocols", ["http"]);
		textEditor.setText("[test][1]\n\n[1]: http://test.com");
		const range = new Range([0, 7], [0, 8]);
		const suggestion = getSuggestionForWord(textEditor, null, range);
		callSuggestion(suggestion);

		expect(checkRange(suggestion, [[0, 7], [0, 8]])).toBe(true);
		expect(shell.openExternal).toHaveBeenCalled();
		expect(shell.openExternal.argsForCall[0][0]).toBe("http://test.com");
	});
});
