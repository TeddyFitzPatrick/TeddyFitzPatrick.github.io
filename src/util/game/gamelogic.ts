import { init, run } from 'clingo-wasm';

let initialized = false;

async function getClingo(): Promise<void> {
  if (!initialized) {
    // @ts-ignore
    await init(new URL('/clingo.wasm', import.meta.url).href);
    initialized = true;
  }
}

function buildClingoProgram(grid: string[][], maxWalls: number): string {
  const R = grid.length;
  const C = grid[0].length;
  const lines: string[] = [];

  lines.push(`width(${C}).`);
  lines.push(`height(${R}).`);

  for (let y = 0; y < R; y++) {
    for (let x = 0; x < C; x++) {
      const cell = grid[y][x];
      const cx = x + 1;
      const cy = y + 1;

      if (cell === 'x') lines.push(`water(${cx},${cy}).`);
      else if (cell === '_') lines.push(`grass(${cx},${cy}).`);
      else if (cell === 'w') lines.push(`water(${cx},${cy}).`);
      else if (cell === 'd') lines.push(`start(${cx},${cy}).`);
    }
  }

  lines.push(`
    { place_wall(X,Y) : grass(X,Y) } <= ${maxWalls}.
    blocked(X,Y) :- place_wall(X,Y).
    blocked(X,Y) :- water(X,Y).
    free(X,Y) :- grid(X,Y), not blocked(X,Y).
    grid(X,Y) :- width(W), height(H), X=1..W, Y=1..H.
    adj(X,Y,X+1,Y) :- grid(X,Y), grid(X+1,Y).
    adj(X,Y,X-1,Y) :- grid(X,Y), grid(X-1,Y).
    adj(X,Y,X,Y+1) :- grid(X,Y), grid(X,Y+1).
    adj(X,Y,X,Y-1) :- grid(X,Y), grid(X,Y-1).
    outside(X,Y) :- free(X,Y), X=1.
    outside(X,Y) :- free(X,Y), Y=1.
    outside(X,Y) :- free(X,Y), width(W), X=W.
    outside(X,Y) :- free(X,Y), height(H), Y=H.
    outside(X2,Y2) :- outside(X1,Y1), adj(X1,Y1,X2,Y2), free(X2,Y2).
    reachable(X,Y) :- start(X,Y), free(X,Y).
    reachable(X2,Y2) :- reachable(X1,Y1), adj(X1,Y1,X2,Y2), free(X2,Y2).
    start_region(X,Y) :- reachable(X,Y), not outside(X,Y).
    :- start(X,Y), outside(X,Y).
    #maximize { 1,X,Y : start_region(X,Y) }.
    #show place_wall/2.
    #show start_region/2.
    #show region_area/1.
    #show is_enclosed/0.
    region_area(A) :- A = #count { X,Y : start_region(X,Y) }.
    is_enclosed :- not outside(X,Y), start(X,Y).
  `);

  const program = lines.join('\n');
  return program;
}

interface ClingoResult {
  walls: { x: number; y: number }[];
  region: { x: number; y: number }[];
  area: number;
  isEnclosed: boolean;
}

function parseClingoOutput(output: string[]): ClingoResult {
  const walls: { x: number; y: number }[] = [];
  const region: { x: number; y: number }[] = [];
  let area = 0;
  let isEnclosed = false;

  for (const atom of output) {
    const wallMatch = atom.match(/^place_wall\((\d+),(\d+)\)$/);
    const regionMatch = atom.match(/^start_region\((\d+),(\d+)\)$/);
    const areaMatch = atom.match(/^region_area\((\d+)\)$/);

    if (wallMatch) walls.push({ x: +wallMatch[1] - 1, y: +wallMatch[2] - 1 });
    else if (regionMatch) region.push({ x: +regionMatch[1] - 1, y: +regionMatch[2] - 1 });
    else if (areaMatch) area = +areaMatch[1];
    else if (atom === 'is_enclosed') isEnclosed = true;
  }

  return { walls, region, area, isEnclosed };
}

export async function solveWithClingo(grid: string[][], maxWalls: number): Promise<ClingoResult> {
  await getClingo();
  const program = buildClingoProgram(grid, maxWalls);
  const result = await run(program, 0);

  if ('Error' in result) {
  console.error('Clingo error:', result.Error);
  return { walls: [], region: [], area: 0, isEnclosed: false };
}

const witnesses = result.Call?.[0]?.Witnesses;
  if (!witnesses || witnesses.length === 0) {
    return { walls: [], region: [], area: 0, isEnclosed: false };
  }

  const bestAtoms = witnesses[witnesses.length - 1].Value;
  return parseClingoOutput(bestAtoms);
}

// Cell values: "" = grass, "x" = water, "w" = placed wall, "d" = dog
// input = array, {mark: true} returns array with enclosed wheat squares marked as "f"
// returns { count, board }. If not enclosed, count = 0 and board = null
export function countEnclosedTiles(input: string[][]): { count: number; board: string[][] | null } {
  const grid = input.map(row => row.map(cell => cell === '' ? '_' : cell));
  const R = grid.length, C = grid[0].length;
  const isWall = (r: number, c: number) => grid[r][c] === 'x' || grid[r][c] === 'w';

  const outside = Array.from({ length: R }, () => new Array(C).fill(false));
  const queue: [number, number][] = [];

  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++)
      if ((r === 0 || r === R-1 || c === 0 || c === C-1) && !isWall(r, c))
        outside[r][c] = true, queue.push([r, c]);

  for (let i = 0; i < queue.length; i++) {
    const [r, c] = queue[i];
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as [number,number][]) {
      const nr = r+dr, nc = c+dc;
      if (nr >= 0 && nr < R && nc >= 0 && nc < C && !outside[nr][nc] && !isWall(nr, nc))
        outside[nr][nc] = true, queue.push([nr, nc]);
    }
  }

  let count = 0;
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++)
      if (!isWall(r, c) && !outside[r][c]) count++;

  if (count === 0) return { count: 0, board: null };

  const board = grid.map((row, r) =>
    row.map((cell, c) =>
      !isWall(r, c) && !outside[r][c] && cell !== 'd' ? 'f' : cell === '_' ? '' : cell
    )
  );
  return { count, board };
}