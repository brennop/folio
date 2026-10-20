import tailwind from 'bun-plugin-tailwind';

// `bun build --compile` on the CLI doesn't read bunfig's [serve.static] plugins,
// so attach Tailwind through the JS API.
const result = await Bun.build({
  entrypoints: ['./src/server.js'],
  compile: { outfile: './dist/folio' }, // add e.g. target: 'bun-linux-x64' to cross-compile
  plugins: [tailwind],
  minify: true,
  sourcemap: 'linked',
  define: { 'process.env.NODE_ENV': '"production"' },
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

console.log('Built dist/folio');
