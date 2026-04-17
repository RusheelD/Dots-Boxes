import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const cssPath = path.join(process.cwd(), "styles.css");
const css = fs.readFileSync(cssPath, "utf8");

const mediaBlock = /@media\s*\(max-width:\s*600px\)\s*{([\s\S]*?)}/m;

describe("Responsive styles", () => {
  it("tunes board wrapper height for small screens", () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*600px\)[\s\S]*?\.board-wrapper\s*{[\s\S]*?max-height:\s*60vh;/m);
  });

  it("stacks controls vertically on small screens", () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*600px\)[\s\S]*?\.app__controls\s*{[\s\S]*?flex-direction:\s*column;/m);
  });
});
