export default function calculateInventoryWeight(actor) {
  const { EQUIPPED_STATES } = CONFIG.A5E;
  const actorData = actor.system;
  const items = actor.items.map((i) => i);

  const totalItemWeight = items.reduce((acc, curr) => {
    let container = null;
    if (curr.system.containerId) {
      container = items.find((i) => i.uuid === curr.system.containerId);
      if (!container) return acc;
    }

    const equipped = [EQUIPPED_STATES.EQUIPPED, EQUIPPED_STATES.CARRIED]
      .includes(curr.system.equippedState);

    if (!equipped && !container) return acc;
    if (container && container.system.equippedState === EQUIPPED_STATES.NOT_CARRIED) return acc;

    const { quantity } = curr.system;
    const itemWeight = parseFloat(curr.system.weight || 0, 10) ?? 0;

    return acc + (quantity ? itemWeight * quantity : itemWeight);
  }, 0);

  const coinWeight = Object.values(actorData.currency).reduce(
    (acc, curr) => acc + Number(curr),
    0
  );

  const excessSupplyWeight = Math.abs(
    Math.min(0 - (actorData.supply ?? 0), 0)
  );
  const excessGearWeight = Math.abs(
    Math.min(0 - (actorData.gear ?? 0), 0)
  );
  const trackCurrencyWeight = actor.flags?.a5e?.trackCurrencyWeight ?? game.settings.get('a5e', 'currencyWeight');

  return trackCurrencyWeight
    ? totalItemWeight + excessSupplyWeight + excessGearWeight + (coinWeight * 0.02)
    : totalItemWeight + excessSupplyWeight + excessGearWeight;
}
