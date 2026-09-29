import assert from "node:assert/strict";
import test from "node:test";
import { calculateTakeawayPackagingFee } from "./takeaway-packaging";

test("calculates each product packaging fee by quantity", () => {
  assert.equal(
    calculateTakeawayPackagingFee([
      { quantity: 2, unitFee: 800 },
      { quantity: 1, unitFee: 500 },
      { quantity: 3, unitFee: 0 },
    ]),
    2100,
  );
});

test("returns zero when every product has free packaging", () => {
  assert.equal(
    calculateTakeawayPackagingFee([
      { quantity: 2, unitFee: 0 },
      { quantity: 1, unitFee: 0 },
    ]),
    0,
  );
});

test("uses configured small and large packs for piece products", () => {
  const pieceProduct = {
    unitFee: 800,
    isSoldByPiece: true,
    pieceSmallPackSize: 3,
    pieceSmallPackFee: 300,
    pieceLargePackSize: 6,
    pieceLargePackFee: 800,
  };

  assert.equal(
    calculateTakeawayPackagingFee([{ ...pieceProduct, quantity: 3 }]),
    300,
  );
  assert.equal(
    calculateTakeawayPackagingFee([{ ...pieceProduct, quantity: 4 }]),
    800,
  );
  assert.equal(
    calculateTakeawayPackagingFee([{ ...pieceProduct, quantity: 6 }]),
    800,
  );
  assert.equal(
    calculateTakeawayPackagingFee([{ ...pieceProduct, quantity: 7 }]),
    1100,
  );
  assert.equal(
    calculateTakeawayPackagingFee([{ ...pieceProduct, quantity: 9 }]),
    1100,
  );
  assert.equal(
    calculateTakeawayPackagingFee([{ ...pieceProduct, quantity: 12 }]),
    1600,
  );
  assert.equal(
    calculateTakeawayPackagingFee([
      { ...pieceProduct, quantity: 3 },
      { quantity: 2, unitFee: 800 },
    ]),
    1900,
  );
});
