declare const Bun: {
  Transpiler: new (options: { loader: 'ts'; target: 'browser' }) => { transformSync(source: string): string };
};

// This fixture harness runs under Bun without adding Bun's fetch globals to the browser/Node project.
export function transpileTypeScriptFixture(source: string): string {
  return new Bun.Transpiler({ loader: 'ts', target: 'browser' }).transformSync(source);
}
