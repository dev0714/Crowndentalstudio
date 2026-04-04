import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStockHealthSummary, buildStockLocationSummary } from './stock-health';

test('builds stock expiry alerts and reorder queues', () => {
  const summary = buildStockHealthSummary(
    [
      {
        id: 'item-1',
        item_code: 'GLOV-01',
        item_name: 'Gloves',
        category: 'Consumables',
        quantity_on_hand: 3,
        reorder_level: 10,
        expiry_date: '2026-04-25T00:00:00.000Z',
        supplier: 'MedSupplies',
      },
      {
        id: 'item-2',
        item_code: 'BOND-02',
        item_name: 'Bonding agent',
        category: 'Clinical',
        quantity_on_hand: 20,
        reorder_level: 10,
        expiry_date: '2026-04-10T00:00:00.000Z',
        supplier: 'Clinica',
      },
      {
        id: 'item-3',
        item_code: 'MASK-03',
        item_name: 'Masks',
        category: 'Consumables',
        quantity_on_hand: 0,
        reorder_level: 15,
        expiry_date: '2026-03-01T00:00:00.000Z',
        supplier: 'MedSupplies',
      },
    ],
    '2026-04-04T00:00:00.000Z',
  );

  assert.equal(summary.totalItems, 3);
  assert.equal(summary.lowStockCount, 2);
  assert.equal(summary.expiringWithin90Count, 3);
  assert.equal(summary.expiringWithin60Count, 2);
  assert.equal(summary.expiringWithin30Count, 1);
  assert.equal(summary.expiredCount, 1);
  assert.equal(summary.expiryAlerts[0].item_code, 'MASK-03');
  assert.equal(summary.reorderQueue[0].item_code, 'MASK-03');
});

test('groups stock items by storage location', () => {
  const summary = buildStockLocationSummary([
    {
      id: 'item-1',
      item_code: 'GLOV-01',
      item_name: 'Gloves',
      storage_location: 'Room 1 / cupboard A',
    },
    {
      id: 'item-2',
      item_code: 'MASK-03',
      item_name: 'Masks',
      storage_location: 'Room 1 / cupboard A',
    },
    {
      id: 'item-3',
      item_code: 'BOND-02',
      item_name: 'Bonding agent',
      storage_location: 'Lab shelf',
    },
    {
      id: 'item-4',
      item_code: 'WATER-01',
      item_name: 'Water',
      storage_location: null,
    },
  ]);

  assert.equal(summary.totalLocations, 3);
  assert.equal(summary.locations[0].location, 'Room 1 / cupboard A');
  assert.equal(summary.locations[0].itemCount, 2);
  assert.equal(summary.locations[1].location, 'Lab shelf');
  assert.equal(summary.locations[2].location, 'Unassigned');
});
