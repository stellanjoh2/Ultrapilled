/**
 * Whether an append should use grow-pin insert motion.
 * The first object skips it so revealSlotId → scrollPanelTo can land on settings.
 */
export function shouldArmAppendInsert(totalSlotsAfterAdd: number, batchSize = 1): boolean {
  return batchSize === 1 && totalSlotsAfterAdd > 1;
}
