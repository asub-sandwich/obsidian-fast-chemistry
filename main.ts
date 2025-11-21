import {
	App,
	Editor,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

import { EditorView, ViewUpdate } from "@codemirror/view";

interface FastChemSettings {
	automatic: boolean;
}

const DEFAULT_SETTINGS: FastChemSettings = {
	automatic: true,
};

export default class FastChemPlugin extends Plugin {
	settings: FastChemSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "expand-chem-shorthand",
			name: "Expand Chem Shorthand (@, @@)",
			editorCallback: (editor: Editor) => {
				this.expandChemInEditor(editor);
			},
		});

		this.addSettingTab(new FastChemSettingTab(this.app, this));

		this.registerEditorExtension(
			EditorView.updateListener.of((update: ViewUpdate) => {
				if (!this.settings.automatic) return;
				if (!update.docChanged) return;
				if (!update.view.hasFocus) return;

				let insertedText = "";
				for (const tr of update.transactions) {
					tr.changes.iterChanges((_fA, _tA, _fB, _tB, inserted) => {
						insertedText += inserted.toString();
					});
				}
				if (!insertedText.includes("@")) return;

				this.expandAroundCursor(update.view);
			})
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private expandChemInEditor(editor: Editor) {
		const selection = editor.getSelection();
		if (selection && selection.length > 0) {
			editor.replaceSelection(this.expandChemText(selection));
		} else {
			const full = editor.getValue();
			editor.setValue(this.expandChemText(full));
		}
	}
	

	private expandChemText(text: string): string {
		// regex
		const reReplaceBlock = /@@\s*([\s\S]*?)\s*@@/g
		const reIgnoreBlock = /^\$\$[\s\S]*\$\$/
		const reReplaceInline = /(^|[^@])@([^@\n]+?)@/g
		const reIgnoreInline1 = /^\$\\ce\{.*\}\$/
		const reIgnoreInline2 = /^\\ce\{.*\}$/
	
		// First, expand block
		text = text.replace(reReplaceBlock, (_match, inner: string) => {
			const trimmed = inner.trim();
			if (reIgnoreBlock.test(trimmed)) return _match;
			return `$$\n\\ce{${trimmed}}\n$$`;
		});

		// Inline
		text = text.replace(reReplaceInline, (_m, before: string, inner: string) => {
			const trimmed = inner.trim();
			if (reIgnoreInline1.test(trimmed) || reIgnoreInline2.test(trimmed)) {
				return `${before}@${inner}@`;
			}
			return `${before}$\\ce{${trimmed}}$`
		});

		return text;
	}

	private expandAroundCursor(view: EditorView) {
		const state = view.state;
		const cursor = state.selection.main.head;
		const line = state.doc.lineAt(cursor);
		const lineText = line.text;
		const col = cursor - line.from;

		let change = this.inlineChangeForLine(line, col);
		if (!change && lineText.trim() === "@@") {
			change = this.blockChangeForDoc(state, line.number);
		}

		if (!change) return;

		view.dispatch({
			changes: { from: change.from, to: change.to, insert: change.insert},
			selection: {anchor: change.cursor, head: change.cursor},
			scrollIntoView: true,
		});
	}

	private inlineChangeForLine(
		line: { from: number; to: number; text: string},
		cursorCol: number
	):
		| {from: number; to: number; insert: string; cursor: number }
		| null
	{
		const text = line.text;
		const regex = /@([^@\n]+?)@/g;
		let match: RegExpExecArray | null;

		while ((match = regex.exec(text)) !== null) {
			const [full, inner] = match;
			const start = match.index;
			const end = start + full.length;

			if (end !== cursorCol) continue;

			const replacement = `$\\ce{${inner.trim()}}$`;
			return {
				from: line.from + start,
				to: line.from + end,
				insert: replacement,
				cursor: line.from + start + replacement.length,
			};
		}
		return null;
	}

	private blockChangeForDoc(
		state: import("@codemirror/state").EditorState,
		closingLineNumber: number
	):
	| { from: number; to: number; insert: string; cursor: number}
	| null {
		const doc = state.doc;
		const closingLine = doc.line(closingLineNumber);

		if (closingLine.text.trim() !== "@@") return null;

		let openLineNumber: number | null = null;
		for (let ln = closingLineNumber - 1; ln >= 1; ln--) {
			const line = doc.line(ln);
			if (line.text.trim() === "@@") {
				openLineNumber = ln;
				break;
			}	
		}
		if (openLineNumber == null) return null;

		const openLine = doc.line(openLineNumber);
		const innerFrom = openLine.to;
		const innerTo = closingLine.from;
		const innerText = doc.sliceString(innerFrom, innerTo).trim();

		const replacement = `$$\n\\ce{${innerText}}\n$$`;
		return {
			from: openLine.from,
			to: closingLine.to,
			insert:replacement,
			cursor: openLine.from + replacement.length,
		};
	}
}

class FastChemSettingTab extends PluginSettingTab {
	plugin: FastChemPlugin;

	constructor(app: App, plugin: FastChemPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();
		new Setting(containerEl)
			.setName("Automatic expansion")
			.setDesc(
				"When enabled, typing the closing @ triggers expansion"
			)
			.addToggle((toggle) =>
				toggle
				.setValue(this.plugin.settings.automatic)
				.onChange(async (value) => {
					this.plugin.settings.automatic = value;
					await this.plugin.saveSettings();
				})
			);
	}
}
