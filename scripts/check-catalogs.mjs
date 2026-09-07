import fs from "node:fs";
import assert from "node:assert/strict";
import ts from "typescript";

export function checkCatalogs() {
  const en = JSON.parse(
    fs.readFileSync(new URL("../src/locales/en.json", import.meta.url)),
  );
  const fr = JSON.parse(
    fs.readFileSync(new URL("../src/locales/fr.json", import.meta.url)),
  );
  assert.deepEqual(
    Object.keys(en).sort(),
    Object.keys(fr).sort(),
    "Both languages must contain exactly the same keys",
  );
  const placeholders = (value) =>
    [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const key of Object.keys(en)) {
    for (const [locale, catalog] of Object.entries({ en, fr })) {
      assert.ok(catalog[key].trim(), `${locale}: empty translation for ${key}`);
      assert.deepEqual(
        placeholders(catalog[key]),
        placeholders(en[key]),
        `${locale}: mismatched placeholders for ${key}`,
      );
    }
  }
  // Proper names, formulae and language endonyms are intentionally untranslated.
  const literalText = new Set([
    "Human Atlas",
    "Model X Studio",
    "English",
    "Français",
    "CH₄",
    "≈ cm → nm",
  ]);
  // Catch untranslated UI and missing literal t() keys before opening a browser.
  for (const file of fs
    .readdirSync(new URL("../src", import.meta.url), { recursive: true })
    .filter((file) => /\.tsx?$/.test(file))) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const visit = (node) => {
      if (ts.isJsxText(node) && /[A-Za-z]/.test(node.text))
        assert.ok(
          literalText.has(node.text.trim()),
          `${file}: user-facing JSX text must use t(): ${node.text.trim()}`,
        );
      if (
        ts.isJsxAttribute(node) &&
        ["aria-label", "label", "title", "placeholder"].includes(
          node.name.getText(source),
        ) &&
        node.initializer &&
        ts.isStringLiteral(node.initializer)
      )
        assert.fail(
          `${file}: ${node.name.getText(source)} must use a translated message`,
        );
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(source) === "t" &&
        ts.isStringLiteral(node.arguments[0])
      )
        assert.ok(
          Object.hasOwn(en, node.arguments[0].text),
          `${file}: missing catalog key`,
        );
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  for (const file of fs
    .readdirSync(new URL(".", import.meta.url))
    .filter((file) => /^verify(?:-.*)?\.mjs$/.test(file))) {
    const code = fs.readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(
      code,
      /from ["']\.\/locale-fixture\.mjs["']/,
      `${file}: use the bilingual test fixture`,
    );
    assert.match(
      code,
      /locale:\s*browserLocale/,
      `${file}: set the browser language`,
    );
    assert.match(
      code,
      /await assertLocale\(/,
      `${file}: assert the scenario language`,
    );
  }
  console.log(
    `PASS catalog parity: ${Object.keys(en).length} messages in English and French`,
  );
}
