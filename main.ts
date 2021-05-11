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
  pairObject: PairObject = {
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
  pairs = {
    "【": "】",
    "《": "》",
    "（": "）",
    "‘": "’",
    "“": "”",
  };

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SampleSettingTab(this.app, this));
    this.registerCodeMirror(cm => {
      cm.on("change", this.change);
    });
    this.registerCodeMirror(cm => {
      cm.on("beforeChange", this.beforeChange);
    });
  }
  change = (cm: CodeMirror.Editor, obj: CodeMirror.EditorChange) => {
    if (obj.origin === "*compose") {
      const symbol = obj.text[0];
      const cursorInfo = cm.getCursor();
      const pair = this.pairs[symbol];
      if (pair === undefined) {
        return;
      }
      if (obj.removed[0].length === 0) {
        cm.replaceRange(pair, cursorInfo, cursorInfo, "*composeSymbol");
        cm.setCursor(cursorInfo);
      } else {
      }
    }

    if (obj.origin === "+delete") {
      if (this.pairs.hasOwnProperty(obj.removed[0])) {
        const value = cm.getRange(
          { line: obj.from.line, ch: obj.from.ch },
          { line: obj.from.line, ch: obj.from.ch + 1 }
        );
        // @ts-ignore
        if (value === this.pairs[obj.removed[0]]) {
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
  };
  beforeChange = (cm: CodeMirror.Editor, obj: CodeMirror.EditorChange) => {
    const allowSelect = this.settings.mySetting;

    const symbol = obj.text[0];
    const cursorInfo = cm.getCursor();
    const pair = this.pairs[symbol];
    if (pair === undefined) {
      return;
    }

    if (allowSelect) {
      if (cm.somethingSelected()) {
        const selected = cm.getSelection();
        const to = cursorInfo;
        const from = {
          line: cursorInfo.line,
          ch: cursorInfo.ch - selected.length,
        };
        obj.update(from, to, [`${symbol}${selected}${pair}`]);
      }
    }
  };

  onunload() {
    this.app.workspace.iterateCodeMirrors(cm => {
      cm.off("beforeChange", this.beforeChange);
    });
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
          this.plugin.settings.mySetting = value;
          await this.plugin.saveSettings();
        })
      );
  }
}
