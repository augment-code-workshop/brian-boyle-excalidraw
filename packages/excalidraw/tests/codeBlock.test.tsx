import {
  CODE_BLOCK_DEFAULT_HEIGHT,
  CODE_BLOCK_DEFAULT_WIDTH,
  DEFAULT_CODE_BLOCK_CODE,
  DEFAULT_CODE_BLOCK_LANGUAGE,
  DEFAULT_CODE_BLOCK_TITLE,
  newCodeBlockElement,
} from "@excalidraw/element";

import type { ExcalidrawCodeBlockElement } from "@excalidraw/element/types";

import { actionChangeCodeBlock } from "../actions/actionCodeBlock";
import { restoreElements } from "../data/restore";
import { Excalidraw } from "../index";
import * as exportUtils from "../scene/export";

import { API } from "./helpers/api";
import { Pointer } from "./helpers/ui";
import {
  act,
  fireEvent,
  render,
  screen,
  unmountComponent,
  waitFor,
} from "./test-utils";

unmountComponent();

const mouse = new Pointer("mouse");
const h = window.h;

const createCodeBlock = () =>
  API.createElement({
    type: "codeblock",
    width: 420,
    height: 260,
    title: "Example",
    language: "typescript",
    code: 'const answer: number = 42;\nconst html = "</text><script>alert(1)</script>";',
  });

describe("code block element", () => {
  it("constructs with serializable defaults and restores missing fields safely", () => {
    const element = newCodeBlockElement({ x: 10, y: 20 });
    expect(element).toMatchObject({
      type: "codeblock",
      title: DEFAULT_CODE_BLOCK_TITLE,
      language: DEFAULT_CODE_BLOCK_LANGUAGE,
      code: DEFAULT_CODE_BLOCK_CODE,
      width: CODE_BLOCK_DEFAULT_WIDTH,
      height: CODE_BLOCK_DEFAULT_HEIGHT,
    });

    const serialized = JSON.parse(JSON.stringify(element));
    const roundTripped = restoreElements([serialized], null)[0];
    expect(roundTripped).toMatchObject({
      title: DEFAULT_CODE_BLOCK_TITLE,
      language: DEFAULT_CODE_BLOCK_LANGUAGE,
      code: DEFAULT_CODE_BLOCK_CODE,
    });

    const legacy = {
      ...serialized,
      title: undefined,
      language: "bogus",
      code: 42,
      width: 0,
      height: undefined,
      roundness: undefined,
    };
    expect(restoreElements([legacy], null)[0]).toMatchObject({
      title: DEFAULT_CODE_BLOCK_TITLE,
      language: DEFAULT_CODE_BLOCK_LANGUAGE,
      code: DEFAULT_CODE_BLOCK_CODE,
      width: CODE_BLOCK_DEFAULT_WIDTH,
      height: CODE_BLOCK_DEFAULT_HEIGHT,
      roundness: { type: expect.any(Number) },
    });

    const explicitlySquare = { ...serialized, roundness: null };
    expect(restoreElements([explicitlySquare], null)[0].roundness).toBeNull();
  });

  it("exports the card title, language, and highlighted code as SVG text", async () => {
    const element = createCodeBlock();
    const svg = await exportUtils.exportToSvg(
      [element],
      {
        exportBackground: false,
        viewBackgroundColor: "#ffffff",
      },
      null,
    );

    expect(svg.textContent).toContain("Example");
    expect(svg.textContent).toContain("typescript");
    expect(svg.textContent).toContain("const answer: number = 42;");
    expect(svg.textContent).toContain("</text><script>alert(1)</script>");
    expect(svg.querySelector("script")).toBeNull();

    const tokenColors = new Set(
      Array.from(svg.querySelectorAll(`[data-id="${element.id}"] tspan`)).map(
        (node) => node.getAttribute("fill"),
      ),
    );
    expect(tokenColors.size).toBeGreaterThan(1);
  });

  it("clips SVG output to its containing frame", async () => {
    const frame = API.createElement({
      type: "frame",
      width: 200,
      height: 150,
    });
    const element = API.createElement({
      type: "codeblock",
      x: 150,
      y: 100,
      width: 420,
      height: 260,
      frameId: frame.id,
    });
    const svg = await exportUtils.exportToSvg(
      [frame, element],
      {
        exportBackground: false,
        viewBackgroundColor: "#ffffff",
        frameRendering: {
          enabled: true,
          name: true,
          outline: true,
          clip: true,
        },
      },
      null,
    );

    expect(svg.querySelector(`[data-id="${element.id}"]`)).toHaveAttribute(
      "clip-path",
      `url(#${frame.id})`,
    );
  });
});

describe("code block editing", () => {
  beforeEach(async () => {
    await render(<Excalidraw handleKeyboardGlobally={true} />);
    API.setElements([]);
  });

  it("creates a code block through the tool flow", () => {
    act(() => h.app.setActiveTool({ type: "codeblock" }));
    mouse.downAt(40, 50);
    mouse.moveTo(460, 310);
    mouse.upAt(460, 310);

    const element = h.elements.at(-1) as ExcalidrawCodeBlockElement;
    expect(element).toMatchObject({
      type: "codeblock",
      width: 420,
      height: 260,
      title: DEFAULT_CODE_BLOCK_TITLE,
      language: DEFAULT_CODE_BLOCK_LANGUAGE,
    });
  });

  it("edits title, language, and code from the selected-element properties", () => {
    const element = createCodeBlock();
    API.setElements([element]);
    API.setSelectedElements([element]);

    fireEvent.change(screen.getByTestId("codeblock-title"), {
      target: { value: "Updated" },
    });
    fireEvent.change(screen.getByTestId("codeblock-language"), {
      target: { value: "python" },
    });
    fireEvent.change(screen.getByTestId("codeblock-code"), {
      target: { value: "print('hello')" },
    });

    expect(API.getElement(element)).toMatchObject({
      title: "Updated",
      language: "python",
      code: "print('hello')",
    });
  });

  it("updates selected code-block properties through the action", () => {
    const element = createCodeBlock();
    API.setElements([element]);
    API.setSelectedElements([element]);

    act(() => {
      h.app.actionManager.executeAction(actionChangeCodeBlock, "api", {
        title: "Action update",
        language: "json",
        code: '{"ok": true}',
      });
    });

    expect(API.getElement(element)).toMatchObject({
      title: "Action update",
      language: "json",
      code: '{"ok": true}',
    });
  });
});

describe("code block mobile toolbar", () => {
  it("selects the code-block tool from the phone extra-tools menu", async () => {
    const { container } = await render(
      <Excalidraw UIOptions={{ getFormFactor: () => "phone" }} />,
    );
    fireEvent.resize(window);
    await waitFor(() => expect(h.app.editorInterface.formFactor).toBe("phone"));

    fireEvent.click(
      container.querySelector(".App-toolbar__extra-tools-trigger")!,
    );
    const tool = await screen.findByTestId("toolbar-codeblock");
    fireEvent.click(tool);

    expect(h.state.activeTool.type).toBe("codeblock");
  });
});
