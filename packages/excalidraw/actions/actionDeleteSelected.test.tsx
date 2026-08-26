import React from "react";

import { Excalidraw } from "../index";
import { API } from "../tests/helpers/api";
import {
  act,
  assertElements,
  fireEvent,
  render,
  screen,
} from "../tests/test-utils";

import { actionDeleteSelected } from "./actionDeleteSelected";

const { h } = window;

const executeDelete = () => {
  act(() => {
    h.app.actionManager.executeAction(actionDeleteSelected);
  });
};

const confirmDelete = () => {
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
};

const executeAndConfirmDelete = () => {
  executeDelete();
  confirmDelete();
};

describe("delete confirmation", () => {
  beforeEach(async () => {
    await render(<Excalidraw />);
  });

  it("tracks only a deletion that proceeds", () => {
    const trackPredicate =
      typeof actionDeleteSelected.trackEvent === "object"
        ? actionDeleteSelected.trackEvent.predicate
        : undefined;
    const rectangles = [
      API.createElement({ type: "rectangle" }),
      API.createElement({ type: "rectangle" }),
    ];
    API.setElements(rectangles);
    API.setSelectedElements(rectangles);

    expect(trackPredicate?.(h.state, h.elements, null)).toBe(false);
    expect(trackPredicate?.(h.state, h.elements, true)).toBe(true);

    API.setSelectedElements([rectangles[0]]);
    expect(trackPredicate?.(h.state, h.elements, null)).toBe(true);

    const frame = API.createElement({ type: "frame" });
    API.setElements([frame]);
    API.setSelectedElements([frame]);
    expect(trackPredicate?.(h.state, h.elements, null)).toBe(false);
  });

  it("deletes one simple selected element immediately", () => {
    const rectangle = API.createElement({ type: "rectangle" });
    API.setElements([rectangle]);
    API.setSelectedElements([rectangle]);

    executeDelete();

    expect(document.querySelector(".confirm-dialog")).toBeNull();
    expect(h.elements[0].isDeleted).toBe(true);
  });

  it("opens a confirmation for multiple selected elements", () => {
    const rectangles = [
      API.createElement({ type: "rectangle" }),
      API.createElement({ type: "rectangle" }),
    ];
    API.setElements(rectangles);
    API.setSelectedElements(rectangles);

    executeDelete();

    expect(document.querySelector(".confirm-dialog")).not.toBeNull();
    expect(h.elements.every((element) => !element.isDeleted)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  });

  it("opens a confirmation for a selected frame", () => {
    const frame = API.createElement({ type: "frame" });
    API.setElements([frame]);
    API.setSelectedElements([frame]);

    executeDelete();

    expect(document.querySelector(".confirm-dialog")).not.toBeNull();
    expect(h.elements[0].isDeleted).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  });

  it("leaves elements and selection untouched when canceled", () => {
    const rectangles = [
      API.createElement({ type: "rectangle" }),
      API.createElement({ type: "rectangle" }),
    ];
    API.setElements(rectangles);
    API.setSelectedElements(rectangles);

    executeDelete();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(document.querySelector(".confirm-dialog")).toBeNull();
    expect(h.elements.every((element) => !element.isDeleted)).toBe(true);
    expect(h.state.selectedElementIds).toEqual({
      [rectangles[0].id]: true,
      [rectangles[1].id]: true,
    });
  });

  it("performs the existing deletion when confirmed", () => {
    const rectangles = [
      API.createElement({ type: "rectangle" }),
      API.createElement({ type: "rectangle" }),
    ];
    API.setElements(rectangles);
    API.setSelectedElements(rectangles);

    executeDelete();
    confirmDelete();

    expect(document.querySelector(".confirm-dialog")).toBeNull();
    expect(h.elements.every((element) => element.isDeleted)).toBe(true);
    expect(h.state.selectedElementIds).toEqual({});
  });
});

describe("deleting selected elements when frame selected should keep children + select them", () => {
  beforeEach(async () => {
    await render(<Excalidraw />);
  });

  it("frame only", async () => {
    const f1 = API.createElement({
      type: "frame",
    });

    const r1 = API.createElement({
      type: "rectangle",
      frameId: f1.id,
    });

    API.setElements([f1, r1]);

    API.setSelectedElements([f1]);

    executeAndConfirmDelete();

    assertElements(h.elements, [
      { id: f1.id, isDeleted: true },
      { id: r1.id, isDeleted: false, selected: true },
    ]);
  });

  it("frame + text container (text's frameId set)", async () => {
    const f1 = API.createElement({
      type: "frame",
    });

    const r1 = API.createElement({
      type: "rectangle",
      frameId: f1.id,
    });

    const t1 = API.createElement({
      type: "text",
      width: 200,
      height: 100,
      fontSize: 20,
      containerId: r1.id,
      frameId: f1.id,
    });

    h.app.scene.mutateElement(r1, {
      boundElements: [{ type: "text", id: t1.id }],
    });

    API.setElements([f1, r1, t1]);

    API.setSelectedElements([f1]);

    executeAndConfirmDelete();

    assertElements(h.elements, [
      { id: f1.id, isDeleted: true },
      { id: r1.id, isDeleted: false, selected: true },
      { id: t1.id, isDeleted: false },
    ]);
  });

  it("frame + text container (text's frameId not set)", async () => {
    const f1 = API.createElement({
      type: "frame",
    });

    const r1 = API.createElement({
      type: "rectangle",
      frameId: f1.id,
    });

    const t1 = API.createElement({
      type: "text",
      width: 200,
      height: 100,
      fontSize: 20,
      containerId: r1.id,
      frameId: null,
    });

    h.app.scene.mutateElement(r1, {
      boundElements: [{ type: "text", id: t1.id }],
    });

    API.setElements([f1, r1, t1]);

    API.setSelectedElements([f1]);

    executeAndConfirmDelete();

    assertElements(h.elements, [
      { id: f1.id, isDeleted: true },
      { id: r1.id, isDeleted: false, selected: true },
      { id: t1.id, isDeleted: false },
    ]);
  });

  it("frame + text container (text selected too)", async () => {
    const f1 = API.createElement({
      type: "frame",
    });

    const r1 = API.createElement({
      type: "rectangle",
      frameId: f1.id,
    });

    const t1 = API.createElement({
      type: "text",
      width: 200,
      height: 100,
      fontSize: 20,
      containerId: r1.id,
      frameId: null,
    });

    h.app.scene.mutateElement(r1, {
      boundElements: [{ type: "text", id: t1.id }],
    });

    API.setElements([f1, r1, t1]);

    API.setSelectedElements([f1, t1]);

    executeAndConfirmDelete();

    assertElements(h.elements, [
      { id: f1.id, isDeleted: true },
      { id: r1.id, isDeleted: false, selected: true },
      { id: t1.id, isDeleted: false },
    ]);
  });

  it("frame + labeled arrow", async () => {
    const f1 = API.createElement({
      type: "frame",
    });

    const a1 = API.createElement({
      type: "arrow",
      frameId: f1.id,
    });

    const t1 = API.createElement({
      type: "text",
      width: 200,
      height: 100,
      fontSize: 20,
      containerId: a1.id,
      frameId: null,
    });

    h.app.scene.mutateElement(a1, {
      boundElements: [{ type: "text", id: t1.id }],
    });

    API.setElements([f1, a1, t1]);

    API.setSelectedElements([f1, t1]);

    executeAndConfirmDelete();

    assertElements(h.elements, [
      { id: f1.id, isDeleted: true },
      { id: a1.id, isDeleted: false, selected: true },
      { id: t1.id, isDeleted: false },
    ]);
  });

  it("frame + children selected", async () => {
    const f1 = API.createElement({
      type: "frame",
    });
    const r1 = API.createElement({
      type: "rectangle",
      frameId: f1.id,
    });
    API.setElements([f1, r1]);

    API.setSelectedElements([f1, r1]);

    executeAndConfirmDelete();

    assertElements(h.elements, [
      { id: f1.id, isDeleted: true },
      { id: r1.id, isDeleted: false, selected: true },
    ]);
  });
});
