import A5EDataModel from '../A5EDataModel';
import SchemaDataModel from '../template/SchemaDataModel';

import RecordField from '../fields/RecordField';
import UnchasteSchemaField from '../fields/UnchasteSchemaField';

// import getCheckNotesData from './CheckNotes';

import {
  getAbilitiesBonusData,
  getAttackBonusData,
  getDamageBonusData,
  getExertionBonusData,
  getHealingBonusData,
  getHitPointBonusData,
  getInitiativeBonusData,
  getMovementBonusData,
  getSensesBonusData,
  getSkillBonusData
} from './Bonuses';

export default class BaseActorData extends A5EDataModel.mixin(SchemaDataModel) {
  static defineSchema() {
    const { fields } = foundry.data;

    return this.mergeSchema(super.defineSchema(), {
      abilities: new fields.SchemaField(
        ['str', 'dex', 'con', 'int', 'wis', 'cha'].reduce((acc, abl) => {
          acc[abl] = new fields.SchemaField({
            value: new fields.NumberField({ required: true, initial: 10, integer: true }),
            check: new fields.SchemaField({
              expertiseDice: new fields.NumberField({
                required: true, initial: 0, integer: true
              }),
              bonus: new fields.StringField({ required: true, initial: '' })
              // notes: new RecordField(
              //   new fields.DocumentIdField({
              //     required: true, initial: () => foundry.utils.randomID()
              //   }),
              //   new fields.SchemaField(getCheckNotesData())
              // )
            }),
            save: new fields.SchemaField({
              proficient: new fields.BooleanField({ required: true, initial: false }),
              expertiseDice: new fields.NumberField({
                required: true, initial: 0, integer: true
              }),
              bonus: new fields.StringField({ required: true, initial: '' }),
              ...(abl === 'con' ? { concentrationBonus: new fields.StringField({ required: true, initial: '' }) } : {})
              // notes: new RecordField(
              //   new fields.DocumentIdField({
              //     required: true, initial: () => foundry.utils.randomID()
              //   }),
              //   new fields.SchemaField(getCheckNotesData())
              // )
            })
          });

          return acc;
        }, {})
      ),
      attributes: new fields.SchemaField({
        ac: new fields.SchemaField({
          baseFormula: new fields.StringField({ required: true, initial: '10 + @dex.mod' }),
          value: new fields.NumberField({ required: true, initial: 0, integer: true })
        }),
        death: new fields.SchemaField({
          success: new fields.NumberField({ required: true, initial: 0, integer: true }),
          failure: new fields.NumberField({ required: true, initial: 0, integer: true })
        }),
        hp: new fields.SchemaField({
          value: new fields.NumberField({ required: true, initial: 10, integer: true }),
          baseMax: new fields.NumberField({ required: true, initial: 10, integer: true }),
          temp: new fields.NumberField({ required: true, initial: 0, integer: true }),
          bonus: new fields.NumberField({ required: true, initial: 0, integer: true })
        }),
        hitDice: new fields.SchemaField({
          ...['d6', 'd8', 'd10', 'd12'].reduce((acc, die) => {
            acc[die] = new fields.SchemaField({
              current: new fields.NumberField({
                required: true, initial: 0, integer: true, min: 0
              }),
              total: new fields.NumberField({
                required: true, initial: 0, integer: true, min: 0
              })
            });

            return acc;
          }, {})
        }),
        initiative: new fields.SchemaField({
          ability: new fields.StringField({ required: true, initial: 'dex' }),
          // TODO: Migration Upgrade - Remove this at a later date when migration is guaranteed
          bonus: new fields.StringField({ required: true, initial: '' }),
          expertiseDice: new fields.NumberField({ required: true, initial: 0, integer: true })
        }),
        movement: new fields.SchemaField({
          burrow: new fields.SchemaField({
            distance: new fields.NumberField({
              required: true, initial: 0, integer: true, min: 0
            }),
            unit: new fields.StringField({ required: true, initial: 'feet' })
          }),
          climb: new fields.SchemaField({
            distance: new fields.NumberField({
              required: true, initial: 0, integer: true, min: 0
            }),
            unit: new fields.StringField({ required: true, initial: 'feet' })
          }),
          fly: new fields.SchemaField({
            distance: new fields.NumberField({
              required: true, initial: 0, integer: true, min: 0
            }),
            unit: new fields.StringField({ required: true, initial: 'feet' })
          }),
          swim: new fields.SchemaField({
            distance: new fields.NumberField({
              required: true, initial: 0, integer: true, min: 0
            }),
            unit: new fields.StringField({ required: true, initial: 'feet' })
          }),
          walk: new fields.SchemaField({
            distance: new fields.NumberField({
              required: true, initial: 0, integer: true, min: 0
            }),
            unit: new fields.StringField({ required: true, initial: 'feet' })
          }),
          traits: new fields.SchemaField({
            hover: new fields.BooleanField({ required: true, initial: false })
          })
        }),
        senses: new fields.SchemaField({
          blindsight: new fields.SchemaField({
            distance: new fields.NumberField({
              required: true, initial: 0, integer: true, min: 0
            }),
            unit: new fields.StringField({ required: true, initial: 'feet' }),
            otherwiseBlind: new fields.BooleanField({ required: true, initial: false })
          }),
          darkvision: new fields.SchemaField({
            distance: new fields.NumberField({
              required: true, initial: 0, integer: true, min: 0
            }),
            unit: new fields.StringField({ required: true, initial: 'feet' })
          }),
          tremorsense: new fields.SchemaField({
            distance: new fields.NumberField({
              required: true, initial: 0, integer: true, min: 0
            }),
            unit: new fields.StringField({ required: true, initial: 'feet' })
          }),
          truesight: new fields.SchemaField({
            distance: new fields.NumberField({
              required: true, initial: 0, integer: true, min: 0
            }),
            unit: new fields.StringField({ required: true, initial: 'feet' })
          })
        }),
        inspiration: new fields.BooleanField({ required: true, initial: false }),
        fatigue: new fields.NumberField({ required: true, initial: 0, integer: true }),
        strife: new fields.NumberField({ required: true, initial: 0, integer: true }),
        spellcasting: new fields.StringField({ required: true, initial: 'int' })
      }),
      bonuses: new fields.SchemaField({
        abilities: new RecordField(
          new fields.DocumentIdField({ required: true, initial: () => foundry.utils.randomID() }),
          new UnchasteSchemaField(getAbilitiesBonusData())
        ),
        attacks: new RecordField(
          new fields.DocumentIdField({ required: true, initial: () => foundry.utils.randomID() }),
          new fields.SchemaField(getAttackBonusData())
        ),
        damage: new RecordField(
          new fields.DocumentIdField({ required: true, initial: () => foundry.utils.randomID() }),
          new fields.SchemaField(getDamageBonusData())
        ),
        exertion: new RecordField(
          new fields.DocumentIdField({ required: true, initial: () => foundry.utils.randomID() }),
          new fields.SchemaField(getExertionBonusData())
        ),
        healing: new RecordField(
          new fields.DocumentIdField({ required: true, initial: () => foundry.utils.randomID() }),
          new fields.SchemaField(getHealingBonusData())
        ),
        hitPoint: new RecordField(
          new fields.DocumentIdField({ required: true, initial: () => foundry.utils.randomID() }),
          new fields.SchemaField(getHitPointBonusData())
        ),
        initiative: new RecordField(
          new fields.DocumentIdField({ required: true, initial: () => foundry.utils.randomID() }),
          new fields.SchemaField(getInitiativeBonusData())
        ),
        movement: new RecordField(
          new fields.DocumentIdField({ required: true, initial: () => foundry.utils.randomID() }),
          new fields.SchemaField(getMovementBonusData())
        ),
        senses: new RecordField(
          new fields.DocumentIdField({ required: true, initial: () => foundry.utils.randomID() }),
          new fields.SchemaField(getSensesBonusData())
        ),
        skills: new RecordField(
          new fields.DocumentIdField({ required: true, initial: () => foundry.utils.randomID() }),
          new fields.SchemaField(getSkillBonusData())
        ),
        maneuverDC: new fields.StringField({ initial: '' }),
        spellDC: new fields.StringField({ initial: '' }),
        // TODO: Migration Upgrade - Remove these at a later date when migration is guaranteed
        meleeSpellAttack: new fields.StringField({ initial: '' }),
        meleeWeaponAttack: new fields.StringField({ initial: '' }),
        rangedSpellAttack: new fields.StringField({ initial: '' }),
        rangedWeaponAttack: new fields.StringField({ initial: '' })
      }),
      currency: new fields.SchemaField({
        cp: new fields.NumberField({ required: true, initial: 0, integer: true }),
        sp: new fields.NumberField({ required: true, initial: 0, integer: true }),
        sc: new fields.NumberField({ required: true, initial: 0, integer: true }),
        ep: new fields.NumberField({ required: true, initial: 0, integer: true }),
        gp: new fields.NumberField({ required: true, initial: 0, integer: true }),
        pp: new fields.NumberField({ required: true, initial: 0, integer: true })
      }),
      details: new fields.SchemaField({
        bio: new fields.StringField({ required: true, initial: '' }),
        creatureTypes: new fields.ArrayField(
          new fields.StringField({ required: true, initial: '' }),
          { required: true, initial: [] }
        ),
        isSwarm: new fields.BooleanField({ required: true, initial: false })
      }),
      grants: new RecordField(
        new fields.DocumentIdField({ required: true, initial: () => foundry.utils.randomID() }),
        new fields.ObjectField()
      ),
      proficiencies: new fields.SchemaField({
        armor: new fields.ArrayField(new fields.StringField({ required: true, initial: '' }), { required: true, initial: [] }),
        languages: new fields.ArrayField(new fields.StringField({ required: true, initial: '' }), { required: true, initial: [] }),
        tools: new fields.ArrayField(new fields.StringField({ required: true, initial: '' }), { required: true, initial: [] }),
        weapons: new fields.ArrayField(new fields.StringField({ required: true, initial: '' }), { required: true, initial: [] })
      }),
      resources: new fields.SchemaField(
        ['primary', 'secondary', 'tertiary', 'quaternary', 'quinary', 'senary', 'septenary', 'octonary'].reduce((acc, res) => {
          acc[res] = new fields.SchemaField({
            label: new fields.StringField({ required: true, initial: '' }),
            value: new fields.NumberField({ required: true, initial: 0, integer: true }),
            max: new fields.StringField({ required: true, initial: '' }),
            per: new fields.StringField({ required: true, initial: '' }),
            hideMax: new fields.BooleanField({ required: true, initial: false }),
            recharge: new fields.SchemaField({
              formula: new fields.StringField({ required: true, initial: '1d6' }),
              threshold: new fields.NumberField({ required: true, initial: 6, integer: true })
            })
          });

          return acc;
        }, {})
      ),
      skills: new fields.SchemaField(
        Object.keys(CONFIG.A5E.skills ?? {}).reduce((acc, skill) => {
          acc[skill] = new fields.SchemaField({
            ability: new fields.StringField({
              required: true, initial: CONFIG.A5E.skillDefaultAbilities[skill] ?? 'int'
            }),
            proficient: new fields.NumberField({
              required: true, initial: 0, integer: true, min: 0, max: 2
            }),
            specialties: new fields.ArrayField(
              new fields.StringField({ required: true, initial: '' }),
              { required: true, initial: [] }
            ),
            expertiseDice: new fields.NumberField({ required: true, initial: 0, integer: true }),
            minRoll: new fields.NumberField({
              required: true, initial: 1, integer: true, min: 1, max: 20
            }),
            bonuses: new fields.SchemaField({
              check: new fields.StringField({ required: true, initial: '' }),
              passive: new fields.NumberField({ required: true, initial: 0, integer: true })
            })
          });

          return acc;
        }, {})
      ),
      source: new fields.SchemaField({
        name: new fields.StringField({ required: true, initial: '' }),
        link: new fields.StringField({ required: true, initial: '' }),
        publisher: new fields.StringField({ required: true, initial: '' })
      }),
      spellBooks: new RecordField(
        new fields.DocumentIdField({ required: true, initial: () => foundry.utils.randomID() }),
        new fields.ObjectField(),
        {
          required: true,
          initial: () => ({ [foundry.utils.randomID()]: {} })
        }
      ),
      traits: new fields.SchemaField({
        size: new fields.StringField({ required: true, initial: 'med' }),
        height: new fields.StringField({ required: true, initial: 'avg' }),
        weight: new fields.StringField({ required: true, initial: 'moderate' }),
        alignment: new fields.ArrayField(
          new fields.StringField({ required: true, initial: '' }),
          { required: true, initial: [] }
        ),
        conditionImmunities: new fields.ArrayField(
          new fields.StringField({ required: true, initial: '' }),
          { required: true, initial: [] }
        ),
        damageImmunities: new fields.ArrayField(
          new fields.StringField({ required: true, initial: '' }),
          { required: true, initial: [] }
        ),
        damageResistances: new fields.ArrayField(
          new fields.StringField({ required: true, initial: '' }),
          { required: true, initial: [] }
        ),
        damageVulnerabilities: new fields.ArrayField(
          new fields.StringField({ required: true, initial: '' }),
          { required: true, initial: [] }
        )
      })
    });
  }
}
