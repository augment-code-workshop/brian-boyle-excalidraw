import {
  CaptureUpdateAction,
  CODE_BLOCK_LANGUAGES,
  isCodeBlockElement,
  newElementWith,
} from "@excalidraw/element";

import type {
  CodeBlockLanguage,
  ExcalidrawCodeBlockElement,
} from "@excalidraw/element/types";

import { register } from "./register";
import { changeProperty } from "./actionProperties";

export type CodeBlockPropertyUpdate = Partial<
  Pick<ExcalidrawCodeBlockElement, "title" | "language" | "code">
>;

export const actionChangeCodeBlock = register<CodeBlockPropertyUpdate>({
  name: "changeCodeBlock",
  label: "Code block",
  trackEvent: false,
  perform: (elements, appState, value) => ({
    elements: changeProperty(elements, appState, (element) =>
      isCodeBlockElement(element) && value
        ? newElementWith(element, value)
        : element,
    ),
    appState,
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  }),
  PanelComponent: ({ app, updateData }) => {
    const element = app.scene
      .getSelectedElements(app.state)
      .find(isCodeBlockElement);

    if (!element) {
      return null;
    }

    return (
      <fieldset className="codeblock-properties">
        <legend>Code block</legend>
        <label>
          Title
          <input
            type="text"
            aria-label="Code block title"
            data-testid="codeblock-title"
            value={element.title}
            onChange={(event) => updateData({ title: event.target.value })}
          />
        </label>
        <label>
          Language
          <select
            aria-label="Code block language"
            data-testid="codeblock-language"
            value={element.language}
            onChange={(event) =>
              updateData({
                language: event.target.value as CodeBlockLanguage,
              })
            }
          >
            {CODE_BLOCK_LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </label>
        <label>
          Code
          <textarea
            aria-label="Code block code"
            data-testid="codeblock-code"
            rows={8}
            spellCheck={false}
            value={element.code}
            onChange={(event) => updateData({ code: event.target.value })}
          />
        </label>
      </fieldset>
    );
  },
});
