/* eslint-disable max-classes-per-file */

import A5EDataModel from '../A5EDataModel';
import GenericDialog from '../../apps/dialogs/initializers/GenericDialog';

import NumericalGrantSelectionDialog from '../../apps/components/grants/NumericalGrantSelectionDialog.svelte';

import { getAbilitiesBonusContext, getSkillBonusContext } from '../actor/Contexts';

export class BaseGrant extends A5EDataModel {
  #component = null;

  constructor(data: any, options: any = {}) {
    // @ts-ignore
    super(data, options);
  }

  static defineSchema() {
    const { fields } = foundry.data;

    return {
      _id: new fields.DocumentIdField({ initial: () => foundry.utils.randomID() }),
      img: new fields.StringField({ required: true, initial: 'icons/svg/upgrade.svg' }),
      grantType: new fields.StringField({ required: true, initial: '' }),
      optional: new fields.BooleanField({ required: true, initial: false })
    };
  }

  async applyGrant(data: any, component: any, options: any = {}): Promise<any> {
    // Open Dialog and get choices
    const dialog = new GenericDialog(
      'Ability Grant Selection',
      component,
      data,
      options
    );

    await dialog.render(true);
    const promise = await dialog.promise;

    if (!promise) return {};
    return promise;
  }
}

export class AbilityGrant extends BaseGrant {
  #component = NumericalGrantSelectionDialog;

  #type = 'ability';

  static defineSchema() {
    const { fields } = foundry.data;

    return this.mergeSchema(super.defineSchema(), {
      grantType: new fields.StringField({ required: true, initial: 'ability' }),
      abilities: new fields.SchemaField({
        base: new fields.ArrayField(
          new fields.StringField({ required: true, initial: '' }),
          { required: true, initial: [] }
        ),
        options: new fields.ArrayField(
          new fields.StringField({ required: true, initial: '' }),
          { required: true, initial: [] }
        ),
        total: new fields.NumberField({ required: true, initial: 0, integer: true })
      }),
      bonus: new fields.StringField({ required: true, initial: '' }),
      context: new fields.SchemaField(getAbilitiesBonusContext('grant'))
    });
  }

  override async applyGrant(actor: typeof Actor): Promise<void> {
    if (!actor) return;

    const dialogData = {
      document: actor,
      base: this.abilities.base,
      bonus: this.bonus,
      choices: this.abilities.options,
      configObject: CONFIG.A5E.abilities,
      count: this.abilities.total,
      heading: 'Ability Grant Selection'
    };

    const promise = await super.applyGrant(dialogData, this.#component, { width: 400 });
    console.log(promise);
    if (!promise.selected) {
      throw new Error('No ability selected');
    }

    // Construct bonus
    const bonus = {
      context: {
        abilities: promise.selected,
        ...this.context
      },
      formula: this.bonus,
      label: this.parent?.name ?? 'Ability Grant',
      default: true
    };

    const bonusId = foundry.utils.randomID();
    const grantData = {
      itemUuid: this.parent.uuid,
      grantId: this._id,
      bonusId,
      type: 'ability'
    };

    await actor.update({
      [`system.bonuses.abilities.${bonusId}`]: bonus,
      'system.grants': {
        ...actor.system.grants,
        [foundry.utils.randomID()]: grantData
      }
    });
  }
}

export class MovementGrant extends BaseGrant {
  #type = 'movement';

  static defineSchema() {
    const { fields } = foundry.data;

    return this.mergeSchema(super.defineSchema(), {
      grantType: new fields.StringField({ required: true, initial: 'movement' }),
      movementMode: new fields.StringField({ required: true, initial: 'walk' }),
      ranges: new fields.SchemaField({
        base: new fields.SchemaField({
          distance: new fields.NumberField(
            { required: true, initial: 0, integer: true }
          ),
          unit: new fields.StringField({ required: true, initial: 'feet' })
        }),
        bonus: new fields.SchemaField({
          distance: new fields.NumberField(
            { required: true, initial: 0, integer: true }
          ),
          unit: new fields.StringField({ required: true, initial: 'feet' })
        })
      })
    });
  }
}

export class ProficiencyGrant extends BaseGrant {
  #type = 'proficiency';

  static defineSchema() {
    const { fields } = foundry.data;

    return this.mergeSchema(super.defineSchema(), {
      grantType: new fields.StringField({ required: true, initial: 'proficiency' }),
      choices: new fields.SchemaField({
        base: new fields.ArrayField(
          new fields.StringField({ nullable: false, initial: '' }),
          { required: true, initial: [] }
        ),
        options: new fields.ArrayField(
          new fields.StringField({ nullable: false, initial: '' }),
          { required: true, initial: [] }
        ),
        total: new fields.NumberField({ required: true, initial: 0, integer: true })
      }),
      proficiencyKey: new fields.StringField({ required: false }),
      proficiencyType: new fields.StringField({ required: true, initial: '' })

    });
  }
}

export class SkillGrant extends BaseGrant {
  #type = 'skill';

  static defineSchema() {
    const { fields } = foundry.data;

    return this.mergeSchema(super.defineSchema(), {
      grantType: new fields.StringField({ required: true, initial: 'skill' }),
      skills: new fields.SchemaField({
        base: new fields.ArrayField(
          new fields.StringField({ required: true, initial: '' }),
          { required: true, initial: [] }
        ),
        options: new fields.ArrayField(
          new fields.StringField({ required: true, initial: '' }),
          { required: true, initial: [] }
        ),
        total: new fields.NumberField({ required: true, initial: 0, integer: true })
      }),
      bonus: new fields.StringField({ required: true, initial: 0 }),
      context: new fields.SchemaField(getSkillBonusContext('grant'))
    });
  }

  static getApplyData() {

  }
}

export class TraitGrant extends BaseGrant {
  #type = 'trait';

  static defineSchema() {
    const { fields } = foundry.data;

    return this.mergeSchema(super.defineSchema(), {

      grantType: new fields.StringField({ required: true, initial: 'trait' }),
      traitType: new fields.StringField({ required: true, initial: '' }),
      choices: new fields.SchemaField({
        base: new fields.ArrayField(
          new fields.StringField({ nullable: false, initial: '' }),
          { required: true, initial: [] }
        ),
        options: new fields.ArrayField(
          new fields.StringField({ nullable: false, initial: '' }),
          { required: true, initial: [] }
        ),
        total: new fields.NumberField({ required: true, initial: 0, integer: true })
      })
    });
  }
}

export class VisionGrant extends BaseGrant {
  #type = 'vision';

  static defineSchema() {
    const { fields } = foundry.data;

    return this.mergeSchema(super.defineSchema(), {
      grantType: new fields.StringField({ required: true, initial: 'vision' }),
      visionMode: new fields.StringField({ required: true, initial: 'darkvision' }),
      ranges: new fields.SchemaField({
        base: new fields.SchemaField({
          distance: new fields.NumberField(
            { required: true, initial: 0, integer: true }
          ),
          unit: new fields.StringField({ required: true, initial: 'feet' })
        }),
        bonus: new fields.SchemaField({
          distance: new fields.NumberField(
            { required: true, initial: 0, integer: true }
          ),
          unit: new fields.StringField({ required: true, initial: 'feet' })
        })
      })
    });
  }
}
