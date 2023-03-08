// eslint-disable-next-line import/no-unresolved
import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';

import CultureDropDialogComponent from '../CultureDropDialog.svelte';

/**
 * Provides a dialog for creating documents that by default is modal and not draggable.
 */
export default class CultureDropDialog extends TJSDialog {
  constructor(actorDocument, itemDocument) {
    super({
      title: 'Test',
      content: {
        class: CultureDropDialogComponent,
        props: { actorDocument, itemDocument }
      }
    }, { classes: ['a5e-sheet'], width: 480 });

    this.promise = new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  close(options) {
    this.resolvePromise(null);
    return super.close(options);
  }

  resolvePromise(data) {
    if (this.resolve) {
      this.resolve(data);
    }
  }

  submit(data) {
    this.resolvePromise(data);
    return super.close();
  }
}
