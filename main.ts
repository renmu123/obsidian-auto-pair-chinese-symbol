import {
  App,
  Modal,
  Plugin,
  PluginSettingTab,
  Setting,
  MarkdownView,
  Editor,
  EditorPosition,
} from "obsidian";

interface MyPluginSettings {
  mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  mySetting: "default",
};

interface Pair {
  left: string;
  right: string;
  code: string;
  shiftKey: boolean;
}

interface PairObject {
  [code: string]: {
    [shiftKey: string]: Pair;
  };
}

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings;

  async onload() {
    await this.loadSettings();

    // this.addSettingTab(new SampleSettingTab(this.app, this));

    this.registerDomEvent(document, "keydown", (event: KeyboardEvent) => {
      // 《》 【】（）‘’ “”
      const editor = this.getEditor();
      const cursorInfo = this.getCursorInfo(editor);

      const code = event.code;
      const key = event.key;
      const shiftKey = event.shiftKey;

      const char = this.getChar(editor, cursorInfo, cursorInfo);

      const pairObject: PairObject = {
        Comma: {
          1: {
            left: "《",
            right: "》",
            code: "Comma",
            shiftKey: true,
          },
        },
        Digit9: {
          1: {
            left: "（",
            right: "）",
            code: "Digit9",
            shiftKey: true,
          },
        },
        BracketLeft: {
          0: {
            left: "【",
            right: "】",
            code: "BracketLeft",
            shiftKey: false,
          },
          1: {
            left: "{",
            right: "}",
            code: "BracketLeft",
            shiftKey: true,
          },
        },
        Quote: {
          0: {
            left: "‘",
            right: "’",
            code: "Quote",
            shiftKey: false,
          },
          1: {
            left: "“",
            right: "”",
            code: "Quote",
            shiftKey: true,
          },
        },
      };

      if (key == "Process") {
        const pairs = pairObject[code];
        if (pairs === undefined) {
          return;
        } else {
          const pair = pairs[shiftKey ? "1" : "0"];
          if (pair === undefined) {
            return;
          } else {
            this.insert(editor, pair.right, cursorInfo, cursorInfo);
            editor.setCursor(cursorInfo);
          }
        }
      }
    });
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  insert(
    editor: Editor,
    replace: string,
    from: EditorPosition,
    to: EditorPosition
  ) {
    editor.replaceRange(replace, from, to);
  }

  getChar(editor: Editor, from: EditorPosition, to: EditorPosition) {
    const newFrom = {
      ...from,
      ch: from.ch - 1,
    };
    return editor.getRange(newFrom, to);
  }
  getCursorInfo(editor: Editor) {
    return editor.getCursor();
  }

  getEditor() {
    const mdView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (mdView) {
      return mdView.editor;
    } else {
      return null;
    }
  }
}

class SampleSettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Settings for my awesome plugin." });

    new Setting(containerEl)
      .setName("Setting #1")
      .setDesc("It's a secret")
      .addText(text =>
        text
          .setPlaceholder("Enter your secret")
          .setValue("")
          .onChange(async value => {
            console.log("Secret: " + value);
            this.plugin.settings.mySetting = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
