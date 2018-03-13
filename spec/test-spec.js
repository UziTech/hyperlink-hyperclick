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

	it("matches a valid http hyperlink", async function () {

		await atom.packages.activatePackage("language-hyperlink");
		atom.config.set("hyperlink-hyperclick.protocols", ["http"]);
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
		const range = new Range([0, 1], [0, 2]);
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
		atom.config.set("hyperlink-hyperclick.protocols", ["http"]);
		this.textEditor.setText("[test][1]\n\n[1]: http://test.com");
		const range = new Range([0, 7], [0, 8]);
		const suggestion = getSuggestionForWord(this.textEditor, null, range);
		callSuggestion(suggestion);

		expect(suggestion).toHaveRange([[0, 7], [0, 8]]);
		expect(shell.openExternal).toHaveBeenCalled();
		expect(shell.openExternal.calls.mostRecent().args[0]).toBe("http://test.com");
	});

	it("matches a url not at the start of a token", function () {
		atom.config.set("hyperlink-hyperclick.protocols", ["test"]);
		this.textEditor.setText("a test://example.com");
		const range = new Range([0, 2], [0, 3]);
		const suggestion = getSuggestionForWord(this.textEditor, null, range);
		callSuggestion(suggestion);

		expect(suggestion).toHaveRange([[0, 2], [0, 20]]);
		expect(shell.openExternal).toHaveBeenCalled();
		expect(shell.openExternal.calls.mostRecent().args[0]).toBe("test://example.com");
	});
});
