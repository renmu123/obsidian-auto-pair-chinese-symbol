import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

interface MyPluginSettings {
  allowSelectEmbed: boolean;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  allowSelectEmbed: false,
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

  pairs: { [name: string]: string } = {
    "【": "】",
    "《": "》",
    "（": "）",
    "‘": "’",
    "“": "”",
    "「": "」",
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
    const symbol = obj.text[0];
    const cursorInfo = cm.getCursor();
    const pair = this.pairs[symbol];
    if (pair === undefined) {
      return;
    }

    cm.replaceRange(pair, cursorInfo, cursorInfo, "*composeSymbol");
    cm.setCursor(cursorInfo);

    if (obj.origin === "+delete") {
      const pair = this.pairs[obj.removed[0]];
      if (pair === undefined) {
        return;
      }

      const value = cm.getRange(
        { line: obj.from.line, ch: obj.from.ch },
        { line: obj.from.line, ch: obj.from.ch + 1 }
      );

      if (value !== pair) {
        return;
      }

      const cur = cm.getCursor();
      cm.replaceRange(
        "",
        { line: cur.line, ch: cur.ch },
        { line: cur.line, ch: cur.ch + 1 },
        "+delete"
      );
    }
  };
  beforeChange = (cm: CodeMirror.Editor, obj: CodeMirror.EditorChange) => {
    const allowSelectEmbed = this.settings.allowSelectEmbed;

    const symbol = obj.text[0];
    const pair = this.pairs[symbol];
    if (pair === undefined) {
      return;
    }

    if (allowSelectEmbed && cm.somethingSelected()) {
      const selected = cm.getSelection();
      const replaceText = `${symbol}${selected}${pair}`;

      // @ts-ignore
      obj.update(null, null, [replaceText]);
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
      .setName("允许选中文字后在两边插入符号")
      .addToggle(text =>
        text
          .setValue(this.plugin.settings.allowSelectEmbed)
          .onChange(async value => {
            this.plugin.settings.allowSelectEmbed = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
