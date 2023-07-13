// eslint-disable-next-line import/no-unresolved
import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';

// eslint-disable-next-line import/no-unresolved
import { TJSDocument } from '@typhonjs-fvtt/runtime/svelte/store';

import DamageBonusDialog from '../DamageBonusConfigDialog.svelte';

/**
 * Provides a dialog for creating documents that by default is modal and not draggable.
 */
export default class DamageBonusConfigDialog extends TJSDialog {
  constructor(actor, damageBonusId, options = {}) {
    super({
      title: `${actor.name} Damage Bonus Configuration`,
      content: {
        class: DamageBonusDialog,
        props: { actor: new TJSDocument(actor), damageBonusId }
      }
    }, {
      classes: ['a5e-sheet'],
      width: options.width ?? 432
    });
  }
}