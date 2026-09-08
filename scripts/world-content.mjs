import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const dataURL = new URL("../src/world/data.ts", import.meta.url);
const modelsURL = new URL("../src/world/models.ts", import.meta.url);

/** Load the browser-independent content module without a build or generated files. */
export function loadWorldContent() {
  const source = fs.readFileSync(dataURL, "utf8");
  const output = ts.transpileModule(source, {
    fileName: dataURL.pathname,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      isolatedModules: true,
    },
  });
  const errors = (output.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.equal(
    errors.length,
    0,
    errors
      .map((error) => ts.flattenDiagnosticMessageText(error.messageText, "\n"))
      .join("\n"),
  );
  const module = { exports: {} };
  // data.ts intentionally has no browser or renderer dependencies. Executing its
  // own compiled module also covers generated atomic branches and copied paths.
  const execute = new Function("module", "exports", output.outputText);
  execute(module, module.exports);
  return module.exports;
}

function modelKinds() {
  const kinds = new Set();
  function visit(node) {
    if (
      ts.isSwitchStatement(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "kind"
    ) {
      for (const clause of node.caseBlock.clauses) {
        if (ts.isCaseClause(clause) && ts.isStringLiteral(clause.expression)) {
          kinds.add(clause.expression.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  for (const path of [
    modelsURL,
    new URL("../src/world/anatomyModels.ts", import.meta.url),
  ]) {
    visit(
      ts.createSourceFile(
        path.pathname,
        fs.readFileSync(path, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      ),
    );
  }
  assert.ok(
    kinds.size > 20,
    "The actual model dispatch must be found in models.ts",
  );
  return kinds;
}

function placeholders(value) {
  return [...value.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)]
    .map((match) => match[1])
    .sort();
}

function bilingual(value, label, locale) {
  assert.ok(
    value && typeof value === "object",
    `${label}: bilingual content is required`,
  );
  assert.deepEqual(
    Object.keys(value).sort(),
    ["en", "fr"],
    `${label}: use both supported languages`,
  );
  for (const language of ["en", "fr"]) {
    assert.equal(
      typeof value[language],
      "string",
      `${label}.${language}: must be text`,
    );
    assert.ok(value[language].trim(), `${label}.${language}: cannot be empty`);
    assert.ok(
      !/\b(?:TODO|TBD|Lorem ipsum)\b/i.test(value[language]),
      `${label}.${language}: unfinished content`,
    );
  }
  assert.deepEqual(
    placeholders(value.en),
    placeholders(value.fr),
    `${label}: interpolation parity`,
  );
  assert.ok(
    value[locale].trim(),
    `${label}: content exists in the active test language`,
  );
}

function distinctIds(entries, label) {
  const ids = entries.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length, `${label}: duplicate IDs`);
  for (const id of ids)
    assert.ok(typeof id === "string" && id.length, `${label}: missing ID`);
}

/**
 * Shared by verify-world.mjs, which invokes the same assertions in en and fr.
 * This module is a content guard, not a second independently maintained suite.
 */
export function assertWorldContent(locale) {
  assert.ok(
    ["en", "fr"].includes(locale),
    "World content checks require an explicit en or fr locale",
  );
  const registry = loadWorldContent();
  const {
    WORLD_NODES: nodes,
    WORLD_ROOTS: roots,
    WORLD_JOURNEYS: journeys,
    WORLD_QUIZZES: quizzes,
    WORLD_MECHANISMS: mechanisms,
    worldPath,
  } = registry;
  assert.ok(
    nodes && typeof nodes === "object",
    "A world content registry is exported",
  );
  assert.equal(
    typeof worldPath,
    "function",
    "Content exposes ancestor navigation",
  );
  const values = Object.values(nodes);
  assert.ok(
    values.length > roots.length,
    "The world contains meaningful multiscale branches",
  );
  assert.deepEqual(
    roots,
    ["human", "tree", "water", "cloud", "rock", "mushroom"],
    "All six object families remain available",
  );
  assert.equal(nodes.world?.parent, undefined, "The world has no parent");
  assert.equal(
    nodes.world?.sizeMeters,
    null,
    "A composite landscape has no physical diameter",
  );
  assert.deepEqual(
    nodes.world.children,
    roots,
    "The world links to each object family once",
  );
  const implementedModels = modelKinds();
  const usedModels = new Set();
  const sources = new Set();
  const incoming = new Map(values.map((node) => [node.id, 0]));

  for (const node of values) {
    const label = `node ${node.id}`;
    assert.equal(
      nodes[node.id],
      node,
      `${label}: registry key and stable ID agree`,
    );
    assert.match(
      node.id,
      /^[a-z0-9]+(?:[/-][a-z0-9]+)*$/,
      `${label}: stable URL-safe identifier`,
    );
    assert.ok(
      ["contains", "madeOf", "sample"].includes(node.relation),
      `${label}: explicit scientific relation`,
    );
    assert.equal(
      node.category,
      node.id.split("/")[0],
      `${label}: category follows its root`,
    );
    assert.match(node.color, /^#[a-f\d]{6}$/i, `${label}: explicit color`);
    assert.ok(
      implementedModels.has(node.model),
      `${label}: model ${node.model} has a real dispatch case, not a silent fallback`,
    );
    usedModels.add(node.model);
    for (const key of [
      "name",
      "description",
      "sizeNote",
      "question",
      "answer",
    ]) {
      bilingual(node[key], `${label}.${key}`, locale);
    }
    assert.ok(
      Array.isArray(node.facts) && node.facts.length,
      `${label}: at least one fact`,
    );
    node.facts.forEach((fact, index) =>
      bilingual(fact, `${label}.facts[${index}]`, locale),
    );
    assert.ok(
      Array.isArray(node.sources) && node.sources.length,
      `${label}: scientific sources`,
    );
    for (const source of node.sources) {
      assert.ok(
        typeof source.title === "string" && source.title.trim(),
        `${label}: source title`,
      );
      const url = new URL(source.url);
      assert.equal(url.protocol, "https:", `${label}: source uses HTTPS`);
      assert.ok(
        url.hostname.includes("."),
        `${label}: public institutional source host`,
      );
      assert.equal(
        url.username + url.password,
        "",
        `${label}: source must not contain credentials`,
      );
      sources.add(url.href);
    }
    if (["quark", "electron", "photon"].includes(node.model)) {
      assert.equal(
        node.sizeMeters,
        null,
        `${label}: elementary particles have no assigned diameter`,
      );
      assert.deepEqual(
        node.children,
        [],
        `${label}: no invented interior below an elementary particle`,
      );
    } else if (node.id !== "world") {
      assert.ok(
        Number.isFinite(node.sizeMeters) && node.sizeMeters > 0,
        `${label}: positive physical or sample extent`,
      );
    }
    assert.ok(Array.isArray(node.children), `${label}: child collection`);
    assert.equal(
      new Set(node.children).size,
      node.children.length,
      `${label}: no duplicate children`,
    );
    assert.equal(
      node.children.includes(node.id),
      false,
      `${label}: cannot contain itself`,
    );
    for (const childId of node.children) {
      const child = nodes[childId];
      assert.ok(child, `${label}: unknown child ${childId}`);
      assert.equal(
        child.parent,
        node.id,
        `${label}: child returns to this actual context`,
      );
      incoming.set(childId, incoming.get(childId) + 1);
      if (node.sizeMeters !== null && child.sizeMeters !== null) {
        assert.ok(
          child.sizeMeters <= node.sizeMeters,
          `${childId}: sampled child cannot exceed its containing region`,
        );
      }
    }
    if (node.children.length) {
      assert.ok(
        node.children.includes(node.defaultChild),
        `${label}: next step is a real direct child`,
      );
    } else
      assert.equal(
        node.defaultChild,
        undefined,
        `${label}: terminal node has no hidden next step`,
      );
  }

  // Walk our own ancestry first so a cycle fails without calling a potentially
  // unbounded worldPath implementation.
  for (const node of values) {
    assert.equal(
      incoming.get(node.id),
      node.id === "world" ? 0 : 1,
      `${node.id}: exactly one navigation parent`,
    );
    const visited = new Set();
    const expected = [];
    let cursor = node;
    while (cursor) {
      assert.ok(
        !visited.has(cursor.id),
        `${node.id}: ancestor cycle at ${cursor.id}`,
      );
      visited.add(cursor.id);
      expected.unshift(cursor.id);
      if (cursor.parent)
        assert.ok(nodes[cursor.parent], `${cursor.id}: missing parent`);
      cursor = cursor.parent ? nodes[cursor.parent] : undefined;
    }
    assert.equal(expected[0], "world", `${node.id}: connected to the world`);
    assert.deepEqual(
      worldPath(node.id),
      expected,
      `${node.id}: outward path preserves context`,
    );
  }

  const descendants = (id) => {
    assert.ok(nodes[id], `Expected educational branch: ${id}`);
    const found = [];
    const pending = [...nodes[id].children];
    while (pending.length) {
      const child = nodes[pending.pop()];
      found.push(child);
      pending.push(...child.children);
    }
    return found;
  };
  for (const root of roots) {
    const branch = descendants(root);
    assert.ok(
      branch.some((node) => node.model === "atom"),
      `${root}: reaches atomic structure`,
    );
    assert.ok(
      branch.some((node) => node.model === "quark"),
      `${root}: reaches an established elementary endpoint`,
    );
  }

  const rbc = "human/vein/blood/red-cell";
  const wbc = "human/vein/blood/white-cell";
  const dna = `${wbc}/nucleus/chromatin/nucleosome/dna`;
  assert.equal(
    nodes[rbc]?.model,
    "redBloodCell",
    "The erythrocyte route remains identifiable",
  );
  assert.ok(
    nodes[rbc].children.includes(`${rbc}/hemoglobin`),
    "Hemoglobin resides in the red cell",
  );
  const excludedFromMatureRedCell = new Set([
    "cellNucleus",
    "nucleus",
    "dna",
    "chromatin",
    "nucleosome",
    "mitochondrion",
    "ribosome",
  ]);
  assert.equal(
    descendants(rbc).some((node) => excludedFromMatureRedCell.has(node.model)),
    false,
    "Mature human red cells do not contain a cellular nucleus, DNA, mitochondria or ribosomes; their atomic nuclei remain allowed",
  );
  assert.equal(
    nodes[wbc]?.model,
    "whiteBloodCell",
    "A separate nucleated white cell supplies the DNA path",
  );
  assert.equal(
    nodes[dna]?.model,
    "dna",
    "The white-cell path reaches DNA through chromatin and nucleosomes",
  );
  assert.ok(
    worldPath(dna).includes(wbc) && !worldPath(dna).includes(rbc),
    "DNA is not accidentally nested inside hemoglobin or a mature red cell",
  );
  assert.equal(
    nodes[`${dna}/nucleotide`]?.model,
    "nucleotide",
    "DNA exposes its nucleotide building blocks",
  );
  assert.equal(
    nodes["human/skin/cell/nucleus"]?.model,
    "cellNucleus",
    "Living epidermal cells retain a distinct nucleus path",
  );
  for (const cell of [wbc, "human/skin/cell", "tree/leaf/cell"]) {
    for (const kind of ["cellNucleus", "mitochondrion", "ribosome"]) {
      assert.ok(
        nodes[cell].children.some((id) => nodes[id].model === kind),
        `${cell}: visible ${kind} has an explorable, correct target`,
      );
    }
  }
  const plantNucleus = nodes["tree/leaf/cell/nucleus"];
  assert.equal(
    plantNucleus?.category,
    "tree",
    "A copied plant nucleus preserves the plant category",
  );
  assert.notDeepEqual(
    plantNucleus.facts,
    nodes[`${wbc}/nucleus`].facts,
    "Plant nuclear facts do not inherit human chromosome counts",
  );
  assert.ok(
    descendants(plantNucleus.id).some((node) => node.model === "dna"),
    "Leaf nuclear DNA remains explorable",
  );
  assert.ok(
    nodes["human/heart/cell"]?.children.includes("human/heart/cell/sarcomere"),
    "The heart has a contractile-cell branch",
  );
  assert.equal(
    nodes["human/lungs/alveolus/capillary"]?.relation,
    "sample",
    "The alveolar capillary is an adjacent-region sample, not blood in the airspace",
  );
  assert.equal(
    nodes["tree/wood/xylem/wall/lignin"]?.model,
    "polymer",
    "Lignin is not represented as a protein",
  );
  assert.equal(
    nodes["tree/wood/xylem/wall/microfibril/cellulose/residue"]?.model,
    "glucoseResidue",
    "A cellulose repeat is a bonded residue, not free glucose",
  );
  assert.equal(
    nodes["rock/quartz/network"]?.model,
    "crystalLattice",
    "Quartz uses an extended atomic network, not free SiO2 molecules",
  );

  const isotopes = {
    H: { atomicNumber: 1, massNumber: 1, charge: 0 },
    C: { atomicNumber: 6, massNumber: 12, charge: 0 },
    O: { atomicNumber: 8, massNumber: 16, charge: 0 },
    Mg: { atomicNumber: 12, massNumber: 24, charge: 2 },
    Si: { atomicNumber: 14, massNumber: 28, charge: 0 },
    Fe: { atomicNumber: 26, massNumber: 56, charge: 2 },
  };
  for (const atom of values.filter((node) => node.model === "atom")) {
    const expected = isotopes[atom.element];
    assert.ok(expected, `${atom.id}: a reviewed isotope and element identity`);
    assert.deepEqual(
      atom.atomic,
      expected,
      `${atom.id}: exact isotope and formal ionic charge`,
    );
    const electronCount = atom.atomic.atomicNumber - atom.atomic.charge;
    assert.ok(
      Number.isInteger(electronCount) && electronCount > 0,
      `${atom.id}: physically possible electron count`,
    );
    if (atom.element === "Fe")
      assert.equal(electronCount, 24, "Formal Fe2+ has 24 electrons");
    if (atom.element === "Mg")
      assert.equal(electronCount, 10, "Formal Mg2+ has 10 electrons");
    const nucleus = nodes[`${atom.id}/nucleus`];
    assert.equal(
      nucleus?.model,
      "atomicNucleus",
      `${atom.id}: atomic, not cellular nucleus`,
    );
    assert.equal(
      nucleus.parent,
      atom.id,
      `${atom.id}: nucleus is a direct constituent`,
    );
    assert.deepEqual(
      nucleus.atomic,
      { ...expected, charge: expected.atomicNumber },
      `${atom.id}: nuclear charge is Z independently of atomic ionization`,
    );
    assert.ok(
      atom.sizeMeters / nucleus.sizeMeters > 1e4,
      `${atom.id}: nuclear and atomic scales remain distinct`,
    );
    assert.ok(
      nucleus.sizeMeters > 1e-15 && nucleus.sizeMeters < 1e-14,
      `${atom.id}: selected light-to-iron nuclear extent is in the femtometer range`,
    );
    const proton = nodes[`${nucleus.id}/proton`];
    assert.deepEqual(
      proton?.atomic,
      { atomicNumber: 1, massNumber: 1, charge: 1 },
      `${atom.id}: proton identity`,
    );
    const neutron = nodes[`${nucleus.id}/neutron`];
    if (expected.massNumber === expected.atomicNumber) {
      assert.equal(
        neutron,
        undefined,
        `${atom.id}: H-1 has no invented neutron`,
      );
    } else {
      assert.deepEqual(
        neutron?.atomic,
        { atomicNumber: 0, massNumber: 1, charge: 0 },
        `${atom.id}: neutron identity`,
      );
    }
    assert.equal(
      nodes[`${atom.id}/electron`]?.model,
      "electron",
      `${atom.id}: accessible electron constituent`,
    );
  }
  for (const node of values.filter((entry) => entry.atomic)) {
    const { atomicNumber: z, massNumber: a, charge } = node.atomic;
    assert.ok(
      Number.isInteger(z) && z >= 0 && Number.isInteger(a) && a >= z,
      `${node.id}: integer nucleon counts`,
    );
    assert.ok(
      Number.isInteger(charge),
      `${node.id}: integral formal atom or nuclear charge`,
    );
  }
  for (const node of values.filter((entry) => entry.model === "quark")) {
    assert.equal(
      nodes[node.parent]?.model,
      "nucleon",
      `${node.id}: quark belongs to a nucleon, not an electron`,
    );
    assert.ok(
      ["up", "down"].includes(node.quarkFlavor),
      `${node.id}: explicit flavor for correct picking`,
    );
    const charge = node.quarkFlavor === "up" ? "+⅔e" : "−⅓e";
    assert.ok(
      node.facts.some((fact) => fact[locale].includes(charge)),
      `${node.id}: flavor and fractional-charge explanation agree in ${locale}`,
    );
  }
  for (const node of values.filter((entry) => entry.model === "nucleon")) {
    const children = node.children.map((id) => nodes[id]);
    assert.deepEqual(
      children.map((child) => child.quarkFlavor).sort(),
      ["down", "up"],
      `${node.id}: both valence flavors have their own correct target`,
    );
    const preferred = nodes[node.defaultChild];
    assert.equal(
      preferred.id,
      `${node.id}/quark`,
      `${node.id}: stable default particle link remains usable`,
    );
    assert.equal(
      preferred.quarkFlavor,
      node.atomic.charge === 1 ? "up" : "down",
      `${node.id}: preferred representative has the expected flavor`,
    );
  }

  assert.ok(
    Array.isArray(journeys) && journeys.length >= 9,
    "Keep the nine question-based journeys",
  );
  distinctIds(journeys, "journeys");
  for (const journey of journeys) {
    for (const key of ["title", "question", "answer"])
      bilingual(journey[key], `journey ${journey.id}.${key}`, locale);
    assert.ok(
      journey.path.length >= 4,
      `${journey.id}: meaningful multiscale journey`,
    );
    assert.equal(
      journey.path[0],
      "world",
      `${journey.id}: journey starts in the world`,
    );
    for (const [index, id] of journey.path.entries()) {
      assert.ok(nodes[id], `${journey.id}: journey destination exists`);
      if (index)
        assert.equal(
          nodes[id].parent,
          journey.path[index - 1],
          `${journey.id}: every journey transition follows a real edge`,
        );
    }
  }
  assert.ok(
    Array.isArray(quizzes) && quizzes.length >= 10,
    "Keep the ten educational checks",
  );
  distinctIds(quizzes, "quizzes");
  const correctAnswerIndexes = new Set();
  for (const quiz of quizzes) {
    assert.ok(nodes[quiz.node], `${quiz.id}: answer has an explorable target`);
    bilingual(quiz.question, `quiz ${quiz.id}.question`, locale);
    bilingual(quiz.explanation, `quiz ${quiz.id}.explanation`, locale);
    assert.ok(
      quiz.options.length >= 2,
      `${quiz.id}: more than one answer option`,
    );
    quiz.options.forEach((option, index) =>
      bilingual(option, `quiz ${quiz.id}.options[${index}]`, locale),
    );
    assert.ok(
      Number.isInteger(quiz.correct) &&
        quiz.correct >= 0 &&
        quiz.correct < quiz.options.length,
      `${quiz.id}: exactly one valid answer index`,
    );
    assert.equal(
      new Set(quiz.options.map((option) => option[locale])).size,
      quiz.options.length,
      `${quiz.id}: distinct options in ${locale}`,
    );
    correctAnswerIndexes.add(quiz.correct);
  }
  assert.ok(
    correctAnswerIndexes.size > 1,
    "Correct quiz answers must not always occupy the same position",
  );
  assert.ok(
    Array.isArray(mechanisms) && mechanisms.length >= 4,
    "Keep the four explanatory mechanisms",
  );
  distinctIds(mechanisms, "mechanisms");
  for (const mechanism of mechanisms) {
    assert.ok(
      nodes[mechanism.node],
      `${mechanism.id}: mechanism has a real subject`,
    );
    bilingual(mechanism.title, `mechanism ${mechanism.id}.title`, locale);
    assert.equal(
      mechanism.steps.length,
      3,
      `${mechanism.id}: three complete explanatory steps`,
    );
    mechanism.steps.forEach((step, index) => {
      bilingual(
        step.title,
        `mechanism ${mechanism.id}.steps[${index}].title`,
        locale,
      );
      bilingual(
        step.description,
        `mechanism ${mechanism.id}.steps[${index}].description`,
        locale,
      );
    });
  }
  return {
    ...registry,
    validation: {
      locale,
      nodes: values.length,
      roots: roots.length,
      journeys: journeys.length,
      quizzes: quizzes.length,
      mechanisms: mechanisms.length,
      modelKinds: usedModels.size,
      sources: sources.size,
    },
  };
}
