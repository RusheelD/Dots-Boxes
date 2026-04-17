import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

const htmlPath = path.join(process.cwd(), "index.html");
const html = fs.readFileSync(htmlPath, "utf8");

const loadDocument = () => {
  document.documentElement.innerHTML = html;
};

describe("Static hosting HTML shell", () => {
  beforeEach(() => {
    loadDocument();
  });

  it("links the main stylesheet", () => {
    const link = document.querySelector("link[rel=\"stylesheet\"]");
    expect(link).toBeTruthy();
    const href = link?.getAttribute("href") ?? "";
    expect(href.endsWith("styles.css")).toBe(true);
  });

  it("loads main.js with a script tag", () => {
    const script = document.querySelector("script[src]");
    expect(script).toBeTruthy();
    const src = script?.getAttribute("src") ?? "";
    expect(src.endsWith("main.js")).toBe(true);
  });

  it("includes favicon and mobile meta tags", () => {
    const favicon = document.querySelector("link[rel=\"icon\"]");
    expect(favicon).toBeTruthy();
    const faviconHref = favicon?.getAttribute("href") ?? "";
    expect(faviconHref.endsWith("favicon.svg")).toBe(true);

    const viewport = document.querySelector("meta[name=\"viewport\"]");
    expect(viewport).toBeTruthy();
    expect(viewport?.getAttribute("content") ?? "").toContain("width=device-width");

    const theme = document.querySelector("meta[name=\"theme-color\"]");
    expect(theme).toBeTruthy();
    expect(theme?.getAttribute("content") ?? "").toBeTruthy();
  });

  it("includes the main app container", () => {
    const container = document.querySelector("#app");
    expect(container).toBeTruthy();
  });
});
