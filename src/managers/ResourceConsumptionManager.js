import getDeterministicBonus from '../dice/getDeterministicBonus';

export default class ResourceConsumptionManager {
  #actor;

  #item;

  #actionId;

  #consumptionData;

  #updates;

  constructor(actor, item, actionId, consumptionData) {
    this.#actor = actor;
    this.#item = item;
    this.#actionId = actionId;
    this.#consumptionData = consumptionData;

    this.#updates = {
      actor: {},
      item: {}
    };
  }

  get action() {
    return this.#item.actions[this.#actionId];
  }

  async consumeResources() {
    const consumers = Object.values(this.action?.consumers ?? {});

    const {
      actionUses, hitDice, itemUses, spell
    } = this.#consumptionData;

    consumers.forEach((consumer) => {
      const consumerType = consumer?.type;

      if (!consumerType) return;

      if (consumerType === 'actionUses') this.#consumeActionUses(actionUses);
      else if (consumerType === 'hitDice') this.#consumeHitDice(hitDice);
      else if (consumerType === 'itemUses') this.#consumeItemUses(itemUses);
      else if (consumerType === 'spell') this.#consumeSpellResource(spell);
      else if (consumerType === 'resource') this.#consumeResource(consumer);
      else if (['ammunition', 'quantity'].includes(consumerType)) this.#consumeQuantity(consumer);
    });

    // Updates documents
    await this.#item.update(this.#updates.item);
    await this.#actor.update(this.#updates.actor);
  }

  #consumeActionUses({ quantity } = {}) {
    const actionUses = this.action?.uses ?? {};

    if (!quantity || (actionUses?.value !== 0 && !actionUses?.value) || !this.#actor) return;

    const max = getDeterministicBonus(
      actionUses?.max ?? actionUses.value,
      this.#actor.getRollData(this.#item)
    );
    const newValue = Math.clamped(actionUses.value - quantity, 0, max);

    this.#updates.item[`system.actions.${this.#actionId}.uses.value`] = newValue;
  }

  #consumeHitDice({ selected } = {}) {
    const { hitDice } = this.#actor.system.attributes;

    if (!selected || !this.#actor) return;

    Object.entries(hitDice ?? {}).forEach(([die, { current }]) => {
      const consumeValue = selected[die] ?? 0;
      hitDice[die].current = Math.max(current - consumeValue, 0);
    });

    this.#updates.actor['system.attributes.hitDice'] = hitDice;
  }

  #consumeItemUses({ quantity } = {}) {
    const { value } = this.#item.system.uses;
    if ((value !== 0 && !value) || !quantity || !this.#actor) return;

    const max = getDeterministicBonus(
      this.#item.system.uses.max ?? value,
      this.#actor.getRollData(this.#item)
    );
    this.#updates.item['system.uses.value'] = Math.clamped(value - quantity, 0, max);
  }

  async #consumeQuantity({ itemId, quantity } = {}) {
    if (!this.#actor || itemId === '') return;

    const item = this.#actor.items.get(itemId);
    if (!item) return;

    const newQuantity = Math.max((item.system.quantity ?? 0) - quantity, 0);

    await this.#actor.updateEmbeddedDocuments(
      'Item',
      [{ _id: item.id, 'system.quantity': newQuantity }]
    );
  }

  #consumeResource({ quantity, resource, restore } = {}) {
    const config = CONFIG.A5E.resourceConsumerConfig?.[resource];

    if (!this.#actor || !resource || !config) return;

    const { path, type } = config;
    const value = foundry.utils.getProperty(this.#actor.system, path) ?? 0;

    if (type === 'boolean') {
      this.#updates.actor[`system.${path}`] = (restore ?? false);
    } else {
      this.#updates.actor[`system.${path}`] = Math.max(value - quantity, 0);
    }
  }

  #consumeSpellResource(consumptionData) {
    if (!consumptionData || !this.#actor) return;

    const { consume, level, points } = consumptionData;

    if (consume === 'spellSlot') {
      const value = this.#actor.system.spellResources.slots?.[level]?.current;
      this.#updates.actor[`system.spellResources.slots.${level}.current`] = Math.max(value - 1, 0);
    } else if (consume === 'spellPoint') {
      const value = this.#actor.system.spellResources.points.current;
      this.#updates.actor['system.spellResources.points.current'] = Math.max(value - points, 0);
    }
  }
}
