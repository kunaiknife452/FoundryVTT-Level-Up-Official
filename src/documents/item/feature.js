import ItemA5e from './item';

import ItemGrantsManager from '../../managers/ItemGrantsManager';

export default class FeatureItemA5e extends ItemA5e {
  prepareBaseData() {
    super.prepareBaseData();

    // Setup Grants system
    this.grants = new ItemGrantsManager(this);
  }

  async _onCreate(data, options, userId) {
    if (userId !== game.userId) {
      super._onCreate(data, options, userId);
      return;
    }

    // Apply grants if any
    if (this.parent && this.parent.documentName === 'Actor') {
      const actor = this.parent;
      actor.grants.createInitialGrants(this.id);
    }

    super._onCreate(data, options, userId);
  }

  async _onDelete(data, options, user) {
    super._onDelete(data, options, user);

    if (!this.parent || this.parent?.documentName !== 'Actor') return;

    const actor = this.parent;
    await actor.grants.removeGrantsByItem(this.uuid);
  }
}
