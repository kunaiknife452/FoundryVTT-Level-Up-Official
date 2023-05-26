/* eslint-disable max-classes-per-file */
// eslint-disable-next-line import/no-unresolved
import { DynMapReducer } from '@typhonjs-fvtt/runtime/svelte/store';

export class ActorActiveEffectMapReducer extends DynMapReducer {
  initialize() {
    this.filters.add((effect) => effect?.statuses?.size === 0);
    this.sort.set((a, b) => (a?.flags?.a5e?.sort ?? 0) - (b?.flags?.a5e?.sort ?? 0));

    this._types = {
      ongoing: this.derived.create('passive'),
      inactive: this.derived.create('inactive')
    };

    this._types.ongoing.filters.add((effect) => !effect.isSuppressed);
    this._types.inactive.filters.add((effect) => effect.isSuppressed);
  }
}

export class ItemActiveEffectMapReducer extends DynMapReducer {
  initialize() {
    this.filters.add((effect) => effect?.statuses?.size === 0);
    this.sort.set((a, b) => (a?.flags?.a5e?.sort ?? 0) - (b?.flags?.a5e?.sort ?? 0));

    this._types = {
      onUse: this.derived.create('onUse'),
      passive: this.derived.create('passive')
    };
  }
}
