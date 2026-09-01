'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const cardSource = fs.readFileSync(
  path.join(__dirname, '..', 'dist', 'recently-added-media-card.js'),
  'utf8'
);
const context = {
  HTMLElement: class HTMLElement {},
  customElements: { define() {} },
  console,
  window: { customCards: [] },
};
vm.createContext(context);
vm.runInContext(
  `${cardSource}\nglobalThis.RecentlyAddedMediaCardForTest = RecentlyAddedMediaCard;`,
  context
);

function cardWithOrder(sortOrder) {
  const card = Object.create(context.RecentlyAddedMediaCardForTest.prototype);
  card._config = { sort_order: sortOrder };
  return card;
}

const movies = [
  { title: 'Older movie', addedAt: 100 },
  { title: 'Newest movie', addedAt: 400 },
];
const tvShows = [
  { title: 'Newest show', addedAt: 500 },
  { title: 'Older show', addedAt: 200 },
];

test('recent order combines both media types by added date', () => {
  const result = cardWithOrder('recent')._interleave(movies, tvShows);

  assert.deepEqual(
    Array.from(result, (item) => item.title),
    ['Newest show', 'Newest movie', 'Older show', 'Older movie']
  );
});

test('default order remains interleaved for backwards compatibility', () => {
  const result = cardWithOrder('interleaved')._interleave(movies, tvShows);

  assert.deepEqual(
    Array.from(result, (item) => item.title),
    ['Older movie', 'Newest show', 'Newest movie', 'Older show']
  );
});

test('items without an added date sort after dated items', () => {
  const result = cardWithOrder('recent')._interleave(
    [{ title: 'Undated movie' }],
    [{ title: 'Dated show', addedAt: 10 }]
  );

  assert.deepEqual(
    Array.from(result, (item) => item.title),
    ['Dated show', 'Undated movie']
  );
});
