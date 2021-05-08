import {
  App,
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
    this.registerCodeMirror(cm => {
      cm.on("change", this.change);
    });
    this.registerDomEvent(document, "keydown", (event: KeyboardEvent) => {
      const editor = this.getEditor();
      const cursorInfo = this.getCursorInfo(editor);

      // console.log("keydown", event.code, event.key, event);
      const code = event.code;
      const key = event.key;
      const shiftKey = event.shiftKey;

      const value = editor.getRange(
        { ...cursorInfo, ch: cursorInfo.ch - 2 },
        { ...cursorInfo, ch: cursorInfo.ch + 1 }
      );

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

  change(cm: CodeMirror.Editor, obj: CodeMirror.EditorChange) {
    if (obj.origin === "+delete") {
      const pairs = {
        "【": "】",
        "《": "》",
        "（": "）",
        "‘": "’",
        "“": "”",
      };
      if (pairs.hasOwnProperty(obj.removed[0])) {
        const value = cm.getRange(
          { line: obj.from.line, ch: obj.from.ch },
          { line: obj.from.line, ch: obj.from.ch + 1 }
        );
        if (value === pairs[obj.removed[0]]) {
          const cur = cm.getCursor();
          cm.replaceRange(
            "",
            { line: cur.line, ch: cur.ch },
            { line: cur.line, ch: cur.ch + 1 },
            "+delete"
          );
        }
      }
    }
  }

  onunload() {
    this.app.workspace.iterateCodeMirrors(cm => {
      cm.off("change", this.change);
    });
  }

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
