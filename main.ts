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
  mySetting: boolean;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  mySetting: false,
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

export default class AutoPairPlugin extends Plugin {
  settings: MyPluginSettings;
  static changeList: CodeMirror.EditorChange[] = [];

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SampleSettingTab(this.app, this));
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

      const allowSelect = this.settings.mySetting;

      if (key == "Process") {
        const pairs = pairObject[code];
        if (pairs === undefined) {
          return;
        } else {
          const pair = pairs[shiftKey ? "1" : "0"];
          if (pair === undefined) {
            return;
          } else {
            if (editor.somethingSelected()) {
              if (allowSelect) {
                const selected = editor.getSelection();
                const to = cursorInfo;
                const from = {
                  line: cursorInfo.line,
                  ch: cursorInfo.ch - selected.length,
                };

                const mdView = this.app.workspace.getActiveViewOfType(
                  MarkdownView
                );
                mdView.sourceMode.cmEditor.replaceRange(
                  `${pair.left}${selected}${pair.right}`,
                  from,
                  to,
                  "*chineseSymbol"
                );
              } else {
              }
            } else {
              console.log("aaa");
              this.insert(editor, pair.right, cursorInfo, cursorInfo);
              editor.setCursor(cursorInfo);
            }
          }
        }
      }
    });
  }

  change(cm: CodeMirror.Editor, obj: CodeMirror.EditorChange) {
    // console.log(obj);

    if (AutoPairPlugin.changeList.length === 2) {
      AutoPairPlugin.changeList.shift();
    }
    AutoPairPlugin.changeList.push(obj);

    if (
      AutoPairPlugin.changeList.length === 2 &&
      AutoPairPlugin.changeList[0].origin === "*chineseSymbol"
    ) {
      const from = AutoPairPlugin.changeList[1].from;
      const to = AutoPairPlugin.changeList[1].to;
      // cm.replaceRange("", from, { line: to.line, ch: to.ch + 1 }, "*compose");
      cm.undo();
    }

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
  plugin: AutoPairPlugin;

  constructor(app: App, plugin: AutoPairPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Auto pair chinese symbol setting" });

    new Setting(containerEl)
      .setName("选择文字后插入")
      .setDesc("如果是，选中文字后插入符号会自动包裹")
      .addToggle(text =>
        text.setValue(this.plugin.settings.mySetting).onChange(async value => {
          console.log("Secret: " + value);
          this.plugin.settings.mySetting = value;
          await this.plugin.saveSettings();
        })
      );
  }
}
