const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

function loadOperations() {
  const source = fs.readFileSync("src/operations.ts", "utf8");
  const code = ts.transpile(source, {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  });
  const module = { exports: {} };
  new Function("module", "exports", "require", code)(
    module,
    module.exports,
    require,
  );
  return module.exports;
}

const { buildFfmpegArgs } = loadOperations();

for (const nth of [2, 3, 4]) {
  test(`downsample x${nth} compacts selected frames and removes audio`, () => {
    const args = buildFfmpegArgs(
      {
        filePath: "input.mp4",
        downsample: { nth },
        audio: "none",
        convert: false,
      },
      "output.mp4",
    );
    const filter = args[args.indexOf("-vf") + 1];

    assert.equal(
      filter,
      `select='not(mod(n\\,${nth}))',setpts=(PTS-STARTPTS)/${nth},setsar=1`,
    );
    assert.ok(args.includes("-an"));
  });
}

test("downsample ignores replacement audio", () => {
  const args = buildFfmpegArgs(
    {
      filePath: "input.mp4",
      downsample: { nth: 3 },
      audio: "map",
      audioFile: "replacement.mp3",
      convert: false,
    },
    "output.mp4",
  );

  assert.equal(args.filter((arg) => arg === "-i").length, 1);
  assert.ok(args.includes("-an"));
  assert.ok(!args.includes("-map"));
});
