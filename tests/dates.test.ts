import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMonthGrid,
  getDateKeyFromTimestamp,
  parseDateInputToTimestamp,
  toDateInputValue,
} from '../src/features/todos/lib/dates.ts';

test('parseDateInputToTimestamp stores pure dates at local noon', () => {
  const timestamp = parseDateInputToTimestamp('2026-04-06');

  assert.notEqual(timestamp, null);
  assert.equal(toDateInputValue(timestamp), '2026-04-06');
  assert.equal(getDateKeyFromTimestamp(timestamp), '2026-04-06');
  assert.equal(new Date(timestamp as number).getHours(), 12);
});

test('parseDateInputToTimestamp returns null for invalid input', () => {
  assert.equal(parseDateInputToTimestamp(''), null);
  assert.equal(parseDateInputToTimestamp('2026-00-12'), null);
});

test('buildMonthGrid returns a stable six-week calendar grid', () => {
  const grid = buildMonthGrid(new Date(2026, 3, 1));

  assert.equal(grid.length, 42);
  assert.equal(grid[0].getDay(), 0);
  assert.equal(grid[0].getMonth(), 2);
  assert.equal(grid[0].getDate(), 29);
  assert.equal(grid[41].getDay(), 6);
});
