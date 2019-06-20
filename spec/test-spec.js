"use babel";

const {Range} = require("atom");
const shell = require("shell");
const {getSuggestionForWord} = require("../lib/main.js").getProvider();

function callSuggestion(suggestion) {
	if (suggestion && suggestion.callback) {
		suggestion.callback();
	} else {
		throw new Error("No suggestion callback");
	}
}

describe("hyperlink-hyperclick", function () {
	beforeEach(async function () {
		await atom.packages.activatePackage("language-gfm");
		await atom.packages.activatePackage("language-hyperlink");
		await atom.packages.activatePackage("hyperlink-hyperclick");

		this.textEditor = await atom.workspace.open("sample.md");
		this.textEditor.setGrammar(atom.grammars.grammarForScopeName("source.gfm"));

		spyOn(shell, "openExternal");

		jasmine.addMatchers({
			toHaveRange: function () {
				return {
					compare: function (suggestion, expected) {
						if (!suggestion || !suggestion.range) {
							throw new Error("No suggestion range");
						}
						const result = {};
						result.pass = suggestion.range.isEqual(expected);
						const not = (result.pass ? "not " : "");

						const expectedRange = Range.fromObject(expected);

						result.message = `Expected ${suggestion.range} ${not}to be equal to ${expectedRange} class`;
						return result;
					}
				};
			},
		});

	});

	it("matches a valid http hyperlink", function () {
		this.textEditor.setText("<http://example.com>");
		const range = new Range([0, 1], [0, 2]);
		const suggestion = getSuggestionForWord(this.textEditor, null, range);
		callSuggestion(suggestion);

		expect(suggestion).toHaveRange([[0, 1], [0, 19]]);
		expect(shell.openExternal).toHaveBeenCalled();
		expect(shell.openExternal.calls.mostRecent().args[0]).toBe("http://example.com");
	});

	it("only matches configured protocols", function () {
		atom.config.set("hyperlink-hyperclick.protocols", ["https"]);
		this.textEditor.setText("http://example.com");
		const range = new Range([0, 0], [0, 1]);
		const suggestion = getSuggestionForWord(this.textEditor, null, range);
		expect(suggestion).toBeNull();
	});

	it("matches any configured protocol", function () {
		atom.config.set("hyperlink-hyperclick.protocols", ["test"]);
		this.textEditor.setText("test://example.com");
		const range = new Range([0, 0], [0, 1]);
		const suggestion = getSuggestionForWord(this.textEditor, null, range);
		callSuggestion(suggestion);

		expect(suggestion).toHaveRange([[0, 0], [0, 18]]);
		expect(shell.openExternal).toHaveBeenCalled();
		expect(shell.openExternal.calls.mostRecent().args[0]).toBe("test://example.com");
	});

	it("does not match just protocol", function () {
		atom.config.set("hyperlink-hyperclick.protocols", ["test"]);
		this.textEditor.setText("test");
		const range = new Range([0, 1], [0, 2]);
		const suggestion = getSuggestionForWord(this.textEditor, null, range);
		expect(suggestion).toBeNull();
	});

	it("matches gfm link", function () {
		this.textEditor.setText("[test][link]\n\n[link]: http://test.com");
		const range = new Range([0, 7], [0, 8]);
		const suggestion = getSuggestionForWord(this.textEditor, null, range);
		callSuggestion(suggestion);

		expect(suggestion).toHaveRange([[0, 7], [0, 11]]);
		expect(shell.openExternal).toHaveBeenCalled();
		expect(shell.openExternal.calls.mostRecent().args[0]).toBe("http://test.com");
	});

	it("matches a url in the middle of a string", function () {
		this.textEditor.setText("a test://example.com a");
		const range = new Range([0, 2], [0, 3]);
		const suggestion = getSuggestionForWord(this.textEditor, null, range);
		callSuggestion(suggestion);

		expect(suggestion).toHaveRange([[0, 2], [0, 20]]);
		expect(shell.openExternal).toHaveBeenCalled();
		expect(shell.openExternal.calls.mostRecent().args[0]).toBe("test://example.com");
	});

	it("matches a url with matching parentheses", function () {
		this.textEditor.setText("http://example.com/test()_(parens)");
		const range = new Range([0, 0], [0, 1]);
		const suggestion = getSuggestionForWord(this.textEditor, null, range);
		callSuggestion(suggestion);

		expect(suggestion).toHaveRange([[0, 0], [0, 34]]);
		expect(shell.openExternal).toHaveBeenCalled();
		expect(shell.openExternal.calls.mostRecent().args[0]).toBe("http://example.com/test()_(parens)");
	});

	it("does not match unmatched parentheses", function () {
		this.textEditor.setText("(http://example.com/test()_(parens))");
		const range = new Range([0, 1], [0, 2]);
		const suggestion = getSuggestionForWord(this.textEditor, null, range);
		callSuggestion(suggestion);

		expect(suggestion).toHaveRange([[0, 1], [0, 35]]);
		expect(shell.openExternal).toHaveBeenCalled();
		expect(shell.openExternal.calls.mostRecent().args[0]).toBe("http://example.com/test()_(parens)");
	});

	it("matches the correct url", function () {
		this.textEditor.setText("http://example1.com http://example2.com http://example3.com");
		const range = new Range([0, 26], [0, 29]);
		const suggestion = getSuggestionForWord(this.textEditor, null, range);
		callSuggestion(suggestion);

		expect(suggestion).toHaveRange([[0, 20], [0, 39]]);
		expect(shell.openExternal).toHaveBeenCalled();
		expect(shell.openExternal.calls.mostRecent().args[0]).toBe("http://example2.com");
	});

	it("matches a url with authentication", function () {
		this.textEditor.setText("http://user:pass@example.com");
		const range = new Range([0, 0], [0, 1]);
		const suggestion = getSuggestionForWord(this.textEditor, null, range);
		callSuggestion(suggestion);

		expect(suggestion).toHaveRange([[0, 0], [0, 28]]);
		expect(shell.openExternal).toHaveBeenCalled();
		expect(shell.openExternal.calls.mostRecent().args[0]).toBe("http://user:pass@example.com");
	});

	it("matches a url with query", function () {
		this.textEditor.setText("http://example.com?test=1");
		const range = new Range([0, 0], [0, 1]);
		const suggestion = getSuggestionForWord(this.textEditor, null, range);
		callSuggestion(suggestion);

		expect(suggestion).toHaveRange([[0, 0], [0, 25]]);
		expect(shell.openExternal).toHaveBeenCalled();
		expect(shell.openExternal.calls.mostRecent().args[0]).toBe("http://example.com?test=1");
	});

	it("matches a url with query after path", function () {
		this.textEditor.setText("http://example.com/test/?test=1");
		const range = new Range([0, 0], [0, 1]);
		const suggestion = getSuggestionForWord(this.textEditor, null, range);
		callSuggestion(suggestion);

		expect(suggestion).toHaveRange([[0, 0], [0, 31]]);
		expect(shell.openExternal).toHaveBeenCalled();
		expect(shell.openExternal.calls.mostRecent().args[0]).toBe("http://example.com/test/?test=1");
	});

	it("matches a url with query after extension", function () {
		this.textEditor.setText("http://example.com/test.php?test=1");
		const range = new Range([0, 0], [0, 1]);
		const suggestion = getSuggestionForWord(this.textEditor, null, range);
		callSuggestion(suggestion);

		expect(suggestion).toHaveRange([[0, 0], [0, 34]]);
		expect(shell.openExternal).toHaveBeenCalled();
		expect(shell.openExternal.calls.mostRecent().args[0]).toBe("http://example.com/test.php?test=1");
	});

	it("matches a url with hash", function () {
		this.textEditor.setText("http://example.com#test");
		const range = new Range([0, 0], [0, 1]);
		const suggestion = getSuggestionForWord(this.textEditor, null, range);
		callSuggestion(suggestion);

		expect(suggestion).toHaveRange([[0, 0], [0, 23]]);
		expect(shell.openExternal).toHaveBeenCalled();
		expect(shell.openExternal.calls.mostRecent().args[0]).toBe("http://example.com#test");
	});

	it("matches a mailto url", function () {
		this.textEditor.setText("mailto:example@example.com?subject=1&message=2");
		const range = new Range([0, 0], [0, 1]);
		const suggestion = getSuggestionForWord(this.textEditor, null, range);
		callSuggestion(suggestion);

		expect(suggestion).toHaveRange([[0, 0], [0, 46]]);
		expect(shell.openExternal).toHaveBeenCalled();
		expect(shell.openExternal.calls.mostRecent().args[0]).toBe("mailto:example@example.com?subject=1&message=2");
	});

	it("matches a url with port", function () {
		this.textEditor.setText("http://site.com:8080/app");
		const range = new Range([0, 0], [0, 1]);
		const suggestion = getSuggestionForWord(this.textEditor, null, range);
		callSuggestion(suggestion);

		expect(suggestion).toHaveRange([[0, 0], [0, 24]]);
		expect(shell.openExternal).toHaveBeenCalled();
		expect(shell.openExternal.calls.mostRecent().args[0]).toBe("http://site.com:8080/app");
	});

	it("matches a url with port hovering over port", function () {
		this.textEditor.setText("http://site.com:8080/app");
		const range = new Range([0, 17], [0, 18]);
		const suggestion = getSuggestionForWord(this.textEditor, null, range);
		callSuggestion(suggestion);

		expect(suggestion).toHaveRange([[0, 0], [0, 24]]);
		expect(shell.openExternal).toHaveBeenCalled();
		expect(shell.openExternal.calls.mostRecent().args[0]).toBe("http://site.com:8080/app");
	});
});
