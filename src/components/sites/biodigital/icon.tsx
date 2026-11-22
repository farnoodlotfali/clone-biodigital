const glyphs = {
  close: "\uf00d",
  collapse: "\uf100",
  expand: "\uf101",
  select: "\uf245",
  layers: "\uf1de",
  search: "\uf002",
  draw: "\uf304",
  more: "\uf142",
  reset: "\uf601",
  fullscreen: "\uf065",
  info: "\uf05a",
  up: "\uf077",
  down: "\uf078",
  plus: "\u002b",
  minus: "\uf068",
  eye: "\uf06e",
  hide: "\uf070",
  fade: "\uf5c0",
  help: "\uf059",
  undo: "\uf0e2",
  download: "\uf019",
  trash: "\uf2ed",
  brush: "\uf55d",
  move: "\uf0b2",
} as const;
export type IconName = keyof typeof glyphs;
export function Icon({ name }: { name: IconName }) {
  return (
    <span className="bd-icon" aria-hidden="true">
      {glyphs[name]}
    </span>
  );
}
