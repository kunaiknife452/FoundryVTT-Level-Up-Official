/* eslint-disable no-restricted-syntax */
import { localize } from '#runtime/svelte/helper';

import ActiveEffectA5e from '../activeEffect/activeEffect';

import ActorGrantsManager from '../../managers/ActorGrantsManager';
import BonusesManager from '../../managers/BonusesManager';
import MigrationRunnerBase from '../../migration/MigrationRunnerBase';
import SpellBookManager from '../../managers/SpellBookManager';
import RestManager from '../../managers/RestManager';
import RollOverrideManager from '../../managers/RollOverrideManager';
import RollPreparationManager from '../../managers/RollPreparationManager';

import AbilityBonusConfigDialog from '../../apps/dialogs/AbilityBonusConfigDialog.svelte';
import AbilityCheckConfigDialog from '../../apps/dialogs/ActorAbilityConfigDialog.svelte';
import AbilityCheckRollDialog from '../../apps/dialogs/AbilityCheckRollDialog.svelte';
import ActorHpConfigDialog from '../../apps/dialogs/ActorHpConfigDialog.svelte';
import ActorInitConfigDialog from '../../apps/dialogs/ActorInitConfigDialog.svelte';
import ActorManueverConfigDialog from '../../apps/dialogs/ActorManueverConfigDialog.svelte';
import ActorSpellConfigDialog from '../../apps/dialogs/ActorSpellConfigDialog.svelte';
import ArmorClassConfigDialog from '../../apps/dialogs/ArmorClassConfigDialog.svelte';
import AttackBonusConfigDialog from '../../apps/dialogs/AttackBonusConfigDialog.svelte';
import DamageBonusConfigDialog from '../../apps/dialogs/DamageBonusConfigDialog.svelte';
import DetailsConfigDialog from '../../apps/dialogs/DetailsConfigDialog.svelte';
import InitiativeBonusConfigDialog from '../../apps/dialogs/InitiativeBonusConfigDialog.svelte';
import HealingBonusConfigDialog from '../../apps/dialogs/HealingBonusConfigDialog.svelte';
import MovementBonusConfigDialog from '../../apps/dialogs/bonuses/MovementBonusConfigDialog.svelte';
import MovementConfigDialog from '../../apps/dialogs/MovementConfigDialog.svelte';
import RestDialog from '../../apps/dialogs/RestDialog.svelte';
import SavingThrowRollDialog from '../../apps/dialogs/SavingThrowRollDialog.svelte';
import SensesBonusConfigDialog from '../../apps/dialogs/bonuses/SensesBonusConfigDialog.svelte';
import SensesConfigDialog from '../../apps/dialogs/SensesConfigDialog.svelte';
import SkillBonusConfigDialog from '../../apps/dialogs/SkillBonusConfigDialog.svelte';
import SkillCheckRollDialog from '../../apps/dialogs/SkillCheckRollDialog.svelte';
import SkillConfigDialog from '../../apps/dialogs/SkillConfigDialog.svelte';

import GenericConfigDialog from '../../apps/dialogs/initializers/GenericConfigDialog';
import GenericRollDialog from '../../apps/dialogs/initializers/GenericRollDialog';

import automateHpConditions from '../activeEffect/utils/automateHpConditions';
import automateMultiLevelConditions from '../activeEffect/utils/automateMultiLevelConditions';
import getDeterministicBonus from '../../dice/getDeterministicBonus';
import getRollFormula from '../../utils/getRollFormula';
import displayCascadingNumbers from '../../utils/displayCascadingNumbers';

export default class ActorA5e extends Actor {
  #configDialogMap;

  constructor(...args) {
    super(...args);

    this.dialogs ??= {
      abilities: {},
      bonuses: {},
      genericResources: {},
      skills: {},
      notes: {}
    };

    this.#configDialogMap = {
      ability: AbilityCheckConfigDialog,
      abilityBonus: AbilityBonusConfigDialog,
      alignment: DetailsConfigDialog,
      armor: DetailsConfigDialog,
      armorClass: ArmorClassConfigDialog,
      attackBonus: AttackBonusConfigDialog,
      conditionImmunities: DetailsConfigDialog,
      damageBonus: DamageBonusConfigDialog,
      damageImmunities: DetailsConfigDialog,
      damageResistances: DetailsConfigDialog,
      damageVulnerabilities: DetailsConfigDialog,
      healingBonus: HealingBonusConfigDialog,
      health: ActorHpConfigDialog,
      initiative: ActorInitConfigDialog,
      initiativeBonus: InitiativeBonusConfigDialog,
      languages: DetailsConfigDialog,
      maneuvers: ActorManueverConfigDialog,
      maneuverTraditions: DetailsConfigDialog,
      movement: MovementConfigDialog,
      movementBonus: MovementBonusConfigDialog,
      senses: SensesConfigDialog,
      sensesBonus: SensesBonusConfigDialog,
      size: DetailsConfigDialog,
      skill: SkillConfigDialog,
      skillBonus: SkillBonusConfigDialog,
      spells: ActorSpellConfigDialog,
      terrain: DetailsConfigDialog,
      tools: DetailsConfigDialog,
      types: DetailsConfigDialog,
      weapons: DetailsConfigDialog
    };
  }

  /**
   * @returns {Array<ActiveEffectA5e>}
   */
  get actorEffects() {
    return this.effects.map((e) => e);
  }

  /**
   * @returns {String} hitPointFormula
   */
  get hitPointFormula() {
    const { hitDice } = this.system.attributes;
    const { mod } = this.system.abilities.con;

    let hitDiceCount = 0;
    const parts = [];

    Object.entries(hitDice).forEach(([dieSize, { total: diceQuantity }]) => {
      if (!diceQuantity) return;

      parts.push(`${diceQuantity}${dieSize}`);
      hitDiceCount += diceQuantity;
    });

    if (hitDiceCount === 0) return null;

    return `${parts.join(' + ')} + ${hitDiceCount * mod}`;
  }

  /**
   * @override
   * An array of ActiveEffect instances which are present on the
   * Actor which have a limited duration.
   * @type {ActiveEffect[]}
   */
  get temporaryEffects() {
    const effects = [];
    for (const effect of this.allApplicableEffects()) {
      if (effect.active && (effect.isTemporary || effect?.flags?.a5e?.transferType === 'onUse')) {
        effects.push(effect);
      }
    }
    return effects.sort((a, b) => a.name.localeCompare(b.name));
  }

  get visionData() {
    const { senses } = this.system.attributes;

    return {
      hasBlindsight: senses.blindsight.distance > 0,
      hasDarkvision: senses.darkvision.distance > 0,
      hasTremorsense: senses.tremorsense.distance > 0,
      hasTruesight: senses.truesight.distance > 0,
      senses
    };
  }

  /**
   * Sets the order of when to prepare data.
   * @override
   */
  prepareData() {
    this.prepareBaseData();
    super.prepareEmbeddedDocuments();
    this.prepareDerivedData();
    this.afterDerivedData();

    if ((this.system.schemaVersion?.version ?? this.system.schema?.version) < 0.005) return;
    this.prepareArmorClass();
    this.RollOverrideManager.initialize();

    // Initialize the SpellBooks
    this.spellBooks = new SpellBookManager(this);
    this.spellBooks.forEach((spellBook) => spellBook.prepareBaseData());
  }

  /**
   * Prepare base data for the actor.
   * @override
   */
  prepareBaseData() {
    // Register Managers
    this.BonusesManager = new BonusesManager(this);
    this.RollOverrideManager = new RollOverrideManager(this);
    this.grants = new ActorGrantsManager(this);

    // Add AC data to the actor.
    if ((this.system.schemaVersion?.version ?? this.system.schema?.version) >= 0.005) {
      if (typeof this.system.attributes.ac !== 'object') {
        this.system.attributes.ac = { baseFormula: `${this.system.attributes.ac}` };
      }
      this.system.attributes.ac.changes = {
        override: null, bonuses: { components: [], value: 0 }
      };
    }

    // Add base bonuses for abilities
    // Object.entries(this.system.abilities).forEach(([abilityKey, ability]) => {
    //   const value = getDeterministicBonus(
    //     [
    //       ability.value,
    //       this.BonusesManager.getAbilityBonusesFormula(abilityKey, 'base').trim()
    //     ].filter(Boolean).join(' + ')
    //   );

    //   ability.value = value ?? ability.value;
    // });

    const actorType = this.type;
    if (actorType === 'character') {
      this.prepareCharacterData();
    } else {
      this.prepareNPCData();
    }
  }

  /**
   * Prepare the base data for an actor of type character.
   */
  prepareCharacterData() {
    // Calculate the proficiency bonus for the character with a minimum value of 2.
    this.system.attributes.prof = Math.max(2, Math.floor((this.system.details.level + 7) / 4));
  }

  /**
   * Prepare the base data for an actor of type npc.
   */
  prepareNPCData() {
    // Calculate the proficiency bonus for the character with a minimum value of 2.
    this.system.attributes.prof = Math.max(2, Math.floor((this.system.details.cr + 7) / 4));
  }

  /**
   * Apply activeEffects to the actor with the phase 'applyAEs'.
   * @override
   */
  applyActiveEffects() {
    this.overrides = {};

    // Create base to store statuses on actor.
    this.statuses ??= new Set();

    // Identify which special statuses had been active
    const specialStatuses = new Map();
    Object.values(CONFIG.specialStatusEffects).forEach((statusId) => {
      specialStatuses.set(statusId, this.statuses.has(statusId));
    });

    this.statuses.clear();

    // Create base to store effect phases to retry effects on the next pass
    this.effectPhases ??= {
      beforeDerived: [],
      afterDerived: []
    };

    ActiveEffectA5e.applyEffects(
      this,
      this.actorEffects,
      'applyAEs',
      'afterDerived',
      (change) => game.a5e.activeEffects.options[this.type]
        .allOptions[change.key]?.phase === 'applyAEs'
    );

    // Apply special statuses that changed to active tokens
    let tokens;
    // eslint-disable-next-line no-restricted-syntax
    for (const [statusId, wasActive] of specialStatuses) {
      const isActive = this.statuses.has(statusId);
      if (isActive === wasActive) return;
      tokens ??= this.getActiveTokens();
      tokens.forEach((token) => token._onApplyStatusEffect(statusId, isActive));
    }
  }

  /**
   * Prepares derived data for the actor.
   * @override
   */
  prepareDerivedData() {
    const actorData = this.system;

    // Add base bonuses for abilities
    Object.entries(actorData.abilities).forEach(([abilityKey, ability]) => {
      const value = getDeterministicBonus(
        [
          ability.value,
          this.BonusesManager.getAbilityBonusesFormula(abilityKey, 'base').trim()
        ].filter(Boolean).join(' + ')
      );

      ability.value = value ?? ability.value;
    });

    // Calculate the base ability modifier for each ability score.
    Object.values(actorData.abilities).forEach((ability) => {
      const baseMod = Math.floor((ability.value - 10) / 2);

      ability.check.mod = baseMod;
      ability.save.mod = baseMod + (ability.save.proficient ? actorData.attributes.prof : 0);
    });

    /**
     * Calculate the deterministic bonuses for each ability score.
     *
     * IMPORTANT: This step cannot be combined into the previous forEach; otherwise, deterministic
     *            bonuses will be unable to refer to modifiers from subsequent ability scores.
     */
    Object.entries(actorData.abilities).forEach(([abilityKey, ability]) => {
      ['check', 'save'].forEach((key) => {
        let deterministicBonus;

        try {
          deterministicBonus = getDeterministicBonus(
            [
              ability[key].mod,
              this.BonusesManager.getAbilityBonusesFormula(abilityKey, key).trim()
            ].filter(Boolean).join(' + '),
            this.getRollData()
          );
        } finally {
          // Fall back to the base ability mod if no bonus could be calculated.
          ability[key].deterministicBonus = deterministicBonus ?? ability[key].mod;
        }
      });
    });

    const { baseMax: baseHP, bonus: bonusHP } = actorData.attributes.hp;
    actorData.attributes.hp.max = baseHP + bonusHP;

    try {
      actorData.attributes.maneuverDC = getDeterministicBonus([
        8,
        actorData.attributes.prof,
        actorData.bonuses.maneuverDC,
        Math.max(actorData.abilities.str.check.mod, actorData.abilities.dex.check.mod)
      ].join(' + '), this.getRollData());
    } catch {
      // eslint-disable-next-line no-console
      console.error(`Failed to calculate a maneuver DC for ${this.name}`);
      actorData.attributes.maneuverDC = null;
    }

    try {
      actorData.attributes.spellDC = getDeterministicBonus([
        8,
        actorData.attributes.prof,
        actorData.bonuses?.spellDC || 0,
        actorData.abilities[actorData.attributes.spellcasting || 'int'].check.mod
      ].join(' + '), this.getRollData());
    } catch {
      // eslint-disable-next-line no-console
      console.error(`Failed to calculate a spell DC for ${this.name}`);
      actorData.attributes.spellDC = null;
    }

    if (this.type === 'character') {
      actorData.attributes.attunement.current = this.items.reduce((acc, curr) => {
        const { requiresAttunement, attuned } = curr.system;
        return (requiresAttunement && attuned) ? acc + 1 : acc;
      }, 0);
    }

    this.prepareSkills();
    this.prepareMovement();
    this.prepareSenses();

    if ((this.system.schemaVersion?.version ?? this.system.schema?.version) < 0.005) return;
    foundry.utils.setProperty(this, 'system.attributes.ac.changes', this.prepareArmorChanges());
  }

  prepareArmorClass() {
    const changes = this.system.attributes.ac.changes ?? {};

    // Add Base to changes
    let name = 'Natural Armor';
    const baseAC = getDeterministicBonus(
      `${this.system.attributes.ac.baseFormula}` || '10 + @dex.mod',
      this.getRollData()
    );

    // Check for complete override of AC
    const valueOverride = foundry.utils.getProperty(this.overrides, 'system.attributes.ac.value');
    if (valueOverride !== null && valueOverride !== undefined) {
      const effectOverride = this.actorEffects
        .findLast((effect) => effect.changes.some((change) => change.key.includes('ac.value')) && !effect.isSuppressed);

      const tempFinalAC = (changes.override?.value ?? baseAC) + changes.bonuses.value;
      foundry.utils.mergeObject(this.system.attributes.ac, {
        changes,
        value: parseInt(tempFinalAC, 10) || 10
      });

      const overrideChange = effectOverride.apply(
        this,
        effectOverride.changes.find((change) => change.key.includes('ac.value')),
        'afterDerived'
      );

      const overrideValue = Object.values(overrideChange)?.[0] ?? valueOverride;

      name = effectOverride?.name ?? name;
      changes.override = { name, mode: CONFIG.A5E.ARMOR_MODES.OVERRIDE, value: overrideValue };
      changes.bonuses = {
        components: [],
        value: 0
      };
    }

    // Check for baseArmor override
    const overrideProperty = foundry.utils.getProperty(this.overrides, 'system.attributes.ac.baseFormula');
    if (overrideProperty && !valueOverride) {
      const effectOverride = this.actorEffects
        .findLast((effect) => effect.changes.some((change) => change.key.includes('ac.baseFormula')) && !effect.isSuppressed);

      name = effectOverride?.name ?? name;
      changes.override = { name, mode: CONFIG.A5E.ARMOR_MODES.OVERRIDE, value: baseAC };
    }

    changes.override ??= {
      name: 'Natural Armor',
      mode: CONFIG.A5E.ARMOR_MODES.OVERRIDE,
      formula: this.system.attributes.ac.baseFormula,
      value: baseAC
    };

    // Calculate the final AC value.
    const finalAC = (changes.override?.value ?? baseAC) + changes.bonuses.value;

    foundry.utils.mergeObject(this.system.attributes.ac, {
      changes,
      value: parseInt(finalAC, 10) || 10
    });
  }

  determineDefenseConfiguration() {
    // const currentStr = this.system.abilities.str.value;
    return this.items.reduce((acc, item) => {
      if (item.system.equippedState !== CONFIG.A5E.EQUIPPED_STATES.EQUIPPED) return acc;

      const { formula } = item.system.ac ?? {};
      if (!formula) return acc;

      if (item.system.objectType === 'armor') acc.hasArmor = true;
      else if (item.system.objectType === 'shield') acc.hasShield = true;

      return acc;
    }, { hasArmor: false, hasShield: false });
  }

  prepareArmorChanges() {
    // const currentStr = this.system.abilities.str.value;
    const { hasArmor, hasShield } = this.determineDefenseConfiguration();

    const changes = this.items.reduce((acc, item) => {
      const {
        formula, mode, requiresUnarmored, requiresNoShield
      } = item.system.ac ?? {};
      if (!formula) return acc;

      if (item.type === 'feature' && mode === CONFIG.A5E.ARMOR_MODES.OVERRIDE && hasArmor) return acc;
      if ((requiresUnarmored && hasArmor) || (requiresNoShield && hasShield)) return acc;

      if (item.type === 'object'
        && item.system.equippedState !== CONFIG.A5E.EQUIPPED_STATES.EQUIPPED
      ) return acc;

      if (item.system.objectType === 'armor') {
        const isUnderArmor = item.system.materialProperties.includes('underarmor');
        if (isUnderArmor && acc.override) return acc;
      }

      const value = getDeterministicBonus(formula, this.getRollData()) ?? 0;
      const change = {
        name: item.name, id: item.uuid, mode, value
      };

      if (mode === CONFIG.A5E.ARMOR_MODES.OVERRIDE) acc.override = change;
      else if (item.system.objectType === 'shield' && value > (acc.shield?.value ?? 0)) {
        acc.shield = change;
      } else acc.bonuses.push(change);

      return acc;
    }, { override: null, shield: null, bonuses: [] });

    if (changes.shield) changes.bonuses.unshift(changes.shield);
    delete changes.shield;

    // Bring reduced changes in line with the expected format
    const bonuses = changes.bonuses.reduce((acc, { value }) => acc + value, 0);
    changes.bonuses = { components: changes.bonuses, value: bonuses };

    return changes;
  }

  prepareSkills() {
    const actorData = this.system;
    const proficiencyBonus = actorData.attributes.prof;
    const jackOfAllTrades = this.flags.a5e?.jackOfAllTrades;

    Object.values(actorData.skills).forEach((skill) => {
      if (skill.proficient) skill.mod = proficiencyBonus;
      else if (jackOfAllTrades) skill.mod = Math.floor(proficiencyBonus / 2);
      else skill.mod = 0;

      if (skill.ability.startsWith('@attributes.spellcasting')) {
        skill.ability = actorData.attributes.spellcasting;
      }
    });

    Object.entries(actorData.skills).forEach(([key, skill]) => {
      const skillName = localize(CONFIG.A5E.skills[key]);

      let deterministicBonus;

      try {
        deterministicBonus = getDeterministicBonus(
          [
            skill.mod,
            this.BonusesManager.getSkillBonusesFormula(key, skill.ability, 'check', true)
          ].filter(Boolean).join(' + '),
          this.getRollData()
        );
      } catch {
        // eslint-disable-next-line no-console
        console.error(`Couldn't calculate a ${skillName} modifier for ${this.name}`);
      }

      skill.deterministicBonus = deterministicBonus ?? skill.mod;

      try {
        skill.passive = this._calculatePassiveScore(key, skill);
      } catch {
        // eslint-disable-next-line no-console
        console.error(`Couldn't calculate a ${skillName} passive score for ${this.name}`);
        skill.passive = null;
      }
    });
  }

  _calculatePassiveScore(skillKey, skill) {
    const rollData = this.getRollData();

    return getDeterministicBonus([
      10,
      skill.mod,
      rollData.abilities[skill.ability]?.check?.deterministicBonus ?? 0,
      this.BonusesManager.getSkillBonusesFormula(skillKey, skill.ability, 'passive', true)
    ].filter(Boolean).join(' + '), rollData);
  }

  prepareMovement() {
    const { movement } = this.system.attributes;
    for (const [type, { distance }] of Object.entries(movement)) {
      const bonusFormula = this.BonusesManager.getMovementBonusFormula(type);
      if (!bonusFormula) continue;

      const bonus = getDeterministicBonus(bonusFormula, this.getRollData());
      if (!bonus) continue;
      this.system.attributes.movement[type].distance = distance + bonus;
    }
  }

  prepareSenses() {
    const { senses } = this.system.attributes;
    for (const [type, { distance }] of Object.entries(senses)) {
      const bonusFormula = this.BonusesManager.getSensesBonusFormula(type);
      if (!bonusFormula) continue;

      if (bonusFormula === 'unlimited') {
        this.system.attributes.senses[type].distance = 0;
        this.system.attributes.senses[type].unit = 'unlimited';
        continue;
      }

      const bonus = getDeterministicBonus(bonusFormula, this.getRollData());
      if (!bonus) continue;
      this.system.attributes.senses[type].distance = distance + bonus;
    }
  }

  /**
   * Prepare active effects for the actor with the phase 'afterDerived'.
   */
  afterDerivedData() {
    ActiveEffectA5e.applyEffects(
      this,
      this.actorEffects,
      'afterDerived',
      null,
      (change) => game.a5e.activeEffects.options[this.type]
        .allOptions[change.key]?.phase === 'afterDerived'
    );
  }

  /** @inheritdoc */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);

    const items = [...this.items];
    // Add schema version
    if (!this.system.schemaVersion?.version && !this.system.schema?.version) {
      let version = null;
      if (['number', 'string'].includes(typeof this.system.ac)) version = 0.004;
      else if (items.some((i) => typeof i.system?.equipped === 'boolean')) version = 0.003;
      else if (items.some((i) => typeof i.system?.recharge === 'string')) version = 0.002;
      else if (items.some((i) => typeof i.system?.uses?.max === 'number')) version = 0.001;
      else if (typeof this.system.attributes.movement?.walk?.unit !== 'string') version = null;
      else version = MigrationRunnerBase.LATEST_SCHEMA_VERSION;

      this.updateSource({
        'system.schemaVersion.version': version
      });
    }

    // Player character configuration
    if (this.type === 'character') {
      const prototypeToken = { vision: true, actorLink: true, disposition: 1 };
      this.updateSource({ prototypeToken });
    }
  }

  /** @inheritdoc */
  async _preUpdate(changed, options, user) {
    const hasRemoveFlag = Object.keys(this.flags?.a5e ?? {}).includes('-=autoApplyFSConditions');
    const isRemoveFlag = Object.keys(changed?.flags?.a5e ?? {}).includes('-=-=autoApplyFSConditions');

    if (hasRemoveFlag && !isRemoveFlag) {
      await this.unsetFlag('a5e', '-=autoApplyFSConditions');
    }

    const autoApplyFSConditions = changed?.flags?.a5e?.autoApplyFSConditions ?? true;
    if (autoApplyFSConditions) {
      automateMultiLevelConditions(this, foundry.utils.deepClone(changed), user.id);
    }

    foundry.utils.setProperty(changed, 'flags.a5e.-=autoApplyFSConditions', null);

    await super._preUpdate(changed, options, user);

    // If hp drops below 0, set the value to 0.
    if (foundry.utils.getProperty(changed, 'system.attributes.hp.value') < 0) {
      foundry.utils.setProperty(changed, 'system.attributes.hp.value', 0);
    }

    // If temp hp drops to or below 0, set the value to 0.
    if (foundry.utils.getProperty(changed, 'system.attributes.hp.temp') <= 0) {
      foundry.utils.setProperty(changed, 'system.attributes.hp.temp', 0);
    }

    // Reset death save counters
    const isUnconscious = this.system.attributes.hp.value === 0;
    const willRegainConsciousness = foundry.utils.getProperty(changed, 'system.attributes.hp.value') > 0;

    if (isUnconscious && willRegainConsciousness) {
      foundry.utils.setProperty(changed, 'system.attributes.death.success', 0);
      foundry.utils.setProperty(changed, 'system.attributes.death.failure', 0);
    }

    // Update prototype token sizes to reflect the actor's token size
    const automateTokenSize = this.flags?.a5e?.automatePrototypeTokenSize
      ?? game.settings.get('a5e', 'automatePrototypeTokenSize')
      ?? true;

    if (automateTokenSize) {
      if (foundry.utils.getProperty(changed, 'system.traits.size')) {
        const newSize = changed.system.traits.size;

        // If titanic token is already larger than 5, don't change it
        if (newSize !== 'titan' || this.prototypeToken.width < 5) {
          foundry.utils.setProperty(changed, 'prototypeToken.height', CONFIG.A5E.tokenDimensions[newSize]);
          foundry.utils.setProperty(changed, 'prototypeToken.width', CONFIG.A5E.tokenDimensions[newSize]);
        }
      }
    }
  }

  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);

    const applyBloodied = game.settings.get('a5e', 'automateBloodiedApplication') ?? true;
    const applyUnconscious = game.settings.get('a5e', 'automateUnconsciousApplication') ?? true;

    if (applyBloodied) automateHpConditions(this, changed, userId, 'bloodied');
    if (applyUnconscious) automateHpConditions(this, changed, userId, 'unconscious');
  }

  async applyBulkDamage(damageRolls) {
    const updates = {};
    const { value, temp } = this.system.attributes.hp;

    const totalDamage = damageRolls.reduce(
      (cumulativeDamage, [damage]) => cumulativeDamage + Math.floor(damage),
      0
    );

    if (temp) {
      updates['system.attributes.hp'] = {
        temp: Math.clamped(temp - totalDamage, 0, temp),
        value: Math.clamped(value + temp - totalDamage, 0, value)
      };
    } else {
      updates['system.attributes.hp.value'] = Math.clamped(value - totalDamage, 0, value);
    }

    if (game.settings.get('a5e', 'enableCascadingDamageAndHealing')) {
      const actor = this;
      const delayDelta = game.settings.get('a5e', 'cascadingDamageAndHealingDelay');
      let delay = 0;

      damageRolls.forEach(([damage, damageType]) => {
        setTimeout(async () => {
          await displayCascadingNumbers(actor, 'damage', `-${damage}`, damageType);
        }, delay);

        delay += delayDelta;
      });
    }

    Hooks.callAll('a5e.actorDamaged', this, { prevHp: { value, temp }, damageRolls });
    return this.update(updates);
  }

  /**
   * Apply a certain amount of damage to the health pool for Actor, prioritizing temporary hp.
   * Negative damage values will have no effect.
   *
   * @param {number} damage  An amount of damage to apply to the actor.
   * @param {string} damageType A key indicating the type of damage the actor is taking.
   *
   * @returns {Promise<Actor5e>}  A Promise which resolves once the damage has been applied
   */
  async applyDamage(damage, damageType = null) {
    const updates = {};
    const { value, temp } = this.system.attributes.hp;
    // eslint-disable-next-line no-param-reassign
    damage = Math.floor(damage);

    if (temp) {
      updates['system.attributes.hp'] = {
        temp: Math.clamped(temp - damage, 0, temp),
        value: Math.clamped(value + temp - damage, 0, value)
      };
    } else {
      updates['system.attributes.hp.value'] = Math.clamped(value - damage, 0, value);
    }

    if (game.settings.get('a5e', 'enableCascadingDamageAndHealing')) {
      displayCascadingNumbers(this, 'damage', `-${damage}`, damageType);
    }

    Hooks.callAll('a5e.actorDamaged', this, { prevHp: { value, temp }, damage, damageType });
    return this.update(updates);
  }

  async applyBulkHealing(healingRolls) {
    const updates = {};
    const { value, max, temp } = this.system.attributes.hp;
    let showCascadingTemp = true;

    const { healing: healingTotal, temp: tempTotal } = healingRolls.reduce(
      (totalHealing, [healing, healingType]) => {
        if (healingType === 'temporaryHealing') totalHealing.temp += healing;
        else totalHealing.healing += healing;

        return totalHealing;
      },
      { healing: 0, temp: 0 }
    );

    if (tempTotal && tempTotal <= temp) {
      ui.notifications.warn('A5E.ActionWarningTempHpNotOverwritten', { localize: true });
      showCascadingTemp = false;
    } else {
      updates['system.attributes.hp.temp'] = tempTotal;
    }

    updates['system.attributes.hp.value'] = Math.clamped(value + healingTotal, value, max);

    if (game.settings.get('a5e', 'enableCascadingDamageAndHealing')) {
      const actor = this;
      const delayDelta = game.settings.get('a5e', 'cascadingDamageAndHealingDelay');
      let delay = 0;

      healingRolls.forEach(([healing, healingType]) => {
        if (!showCascadingTemp && healingType === 'temporaryHealing') return;

        setTimeout(async () => {
          await displayCascadingNumbers(actor, 'healing', `+${healing}`, healingType);
        }, delay);

        delay += delayDelta;
      });
    }

    Hooks.callAll('a5e.actorHealed', this, { prevHp: { value, temp }, healingRolls });
    return this.update(updates);
  }

  /**
   * Apply a certain amount of healing to the health pool for Actor. Temporary healing can be set
   * using a flag in the options object.
   *
   * When dealing with temporary hp, providing a value below the current temp hp of the target will
   * trigger a warning and abort the update of the actor.
   *
   * Negative healing value are ignored.
   *
   * @param {number} healing        An amount of damage to apply to the actor.
   * @param {string} healingType    A flag for indicating whether the healing being applied is
   *                                temporary.
   *
   * @returns {Promise<Actor5e>}  A Promise which resolves once the damage has been applied
   */
  async applyHealing(healing, healingType) {
    const updates = {};
    const { value, max, temp } = this.system.attributes.hp;
    // eslint-disable-next-line no-param-reassign
    healing = Math.floor(healing);

    if (healingType === 'temporaryHealing') {
      if (healing <= temp) {
        ui.notifications.warn('A5E.ActionWarningTempHpNotOverwritten', { localize: true });
        return this;
      }

      updates['system.attributes.hp.temp'] = healing;
    } else {
      updates['system.attributes.hp.value'] = Math.clamped(value + healing, value, max);
    }

    if (game.settings.get('a5e', 'enableCascadingDamageAndHealing')) {
      displayCascadingNumbers(this, 'healing', `+${healing}`, healingType);
    }

    Hooks.callAll('a5e.actorHealed', this, { prevHp: { value, temp }, healing, healingType });
    return this.update(updates);
  }

  /** @inheritdoc */
  getRollData(item = null) {
    const data = { ...super.getRollData() };
    const { abilities, skills } = this.system;

    data.prof = this.system.attributes.prof || 0;

    // Add a shortcut for abilities.<ability>.check.mod, abilities.<ability>.mod, and <ability>.mod
    Object.entries(abilities).reduce((acc, [key, ability]) => {
      acc.abilities ??= {};
      acc.abilities[key] = { ...ability, mod: ability.check.mod };
      acc[key] = { ...ability, mod: ability.check.mod };

      return acc;
    }, data);

    // Add similar shortcuts for skills
    Object.entries(skills).reduce((acc, [key, skill]) => {
      acc.skills ??= {};
      acc.skills[key] = skill;
      acc[key] = skill;

      return acc;
    }, data);

    data.finesse = {
      mod: Math.max(data.dex.mod, data.str.mod)
    };

    data.level = this.system.details.level;
    data.maneuverDC = this.system.attributes.maneuverDC;

    // Add item rollData
    if (item) {
      data.item = item.getRollData();
    }

    if (item && item.type === 'spell') {
      const spellBook = this.spellBooks.get(item.system.spellBook);
      if (spellBook) {
        data.spell = { mod: spellBook.stats.mod };
        data.spellcasting = { mod: spellBook.stats.mod };
        data.spellDC = spellBook.stats.dc;
      }
    }

    if (!data.spell || !data.spellDC) {
      data.spell = { mod: this._calculateSpellcastingMod() };
      data.spellcasting = { mod: data.spell.mod };
      data.spellDC = this.system.attributes.spellDC;
    }

    return data;
  }

  _calculateSpellcastingMod() {
    const { abilities, attributes } = this.system;
    const spellcastingAbility = attributes.spellcasting || 'int';

    return abilities[spellcastingAbility].check.mod;
  }

  addBonus(type = 'damage') {
    const bonuses = foundry.utils.duplicate(this._source.system.bonuses[type] ?? {});

    if (!Object.keys(CONFIG.A5E.bonusTypes)?.includes(type)) return;

    this.update({
      [`system.bonuses.${type}`]: {
        ...bonuses,
        [foundry.utils.randomID()]: {}
      }
    });
  }

  #configure(key, title, data, options) {
    if (!this.isOwner) return;

    const component = this.#configDialogMap[key];
    let dialog = null;

    if (key === 'ability') dialog = this.dialogs.abilities[data.abilityKey];
    else if (key === 'skill') dialog = this.dialogs.skills[data.skillKey];
    else if (Object.values(CONFIG.A5E.bonusDialogKeys).includes(key)) {
      dialog = this.dialogs.bonuses[data.bonusID];
    }
    else dialog = this.dialogs[key];

    if (!dialog) {
      dialog = new GenericConfigDialog(this, title, component, data, options);

      if (key === 'ability') this.dialogs.abilities[data.abilityKey] = dialog;
      else if (key === 'skill') this.dialogs.skills[data.skillKey] = dialog;
      else if (Object.values(CONFIG.A5E.bonusDialogKeys).includes(key)) {
        this.dialogs.bonuses[data.bonusID] = dialog;
      }
      else this.dialogs[key] = dialog;
    }

    dialog.render(true);
  }

  configureAbilityScore(data = {}, options = {}) {
    const title = localize(
      'A5E.AbilityCheckPromptTitle',
      { name: this.name, ability: localize(CONFIG.A5E.abilities[data.abilityKey]) }
    );

    this.#configure('ability', title, data, options);
  }

  configureAlignment(data = {}, options = {}) {
    const title = localize('A5E.AlignmentConfigurationPrompt', { name: this.name });

    data.heading ??= 'A5E.Alignments';
    data.propertyKey ??= 'system.traits.alignment';
    data.configObject ??= CONFIG.A5E.alignments;
    data.type ??= 'alignment';

    this.#configure('alignment', title, data, options);
  }

  configureArmorClass(data = {}, options = {}) {
    const title = localize('A5E.ACConfigurationPrompt', { name: this.name });
    this.#configure('armorClass', title, data, options);
  }

  configureArmorProficiencies(data = {}, options = {}) {
    const title = localize('A5E.ArmorProficienciesConfigurationPrompt', { name: this.name });

    data.heading ??= 'A5E.ArmorProficiencies';
    data.propertyKey ??= 'system.proficiencies.armor';
    data.configObject ??= CONFIG.A5E.armor;
    data.type ??= 'armorTypes';

    this.#configure('armor', title, data, options);
  }

  configureConditionImmunities(data = {}, options = {}) {
    const title = localize('A5E.ConditionImmunitiesConfigurationPrompt', { name: this.name });

    data.heading ??= 'A5E.ConditionImmunities';
    data.configObject ??= CONFIG.A5E.conditions;
    data.propertyKey ??= 'system.traits.conditionImmunities';
    data.type ??= 'conditionImmunities';

    this.#configure('conditionImmunities', title, data, options);
  }

  configureCreatureTypes(data = {}, options = {}) {
    const title = localize('A5E.CreatureTypesConfigurationPrompt', { name: this.name });

    data.heading ??= 'A5E.CreatureTypePlural';
    data.configObject ??= CONFIG.A5E.creatureTypes;
    data.propertyKey ??= 'system.details.creatureTypes';
    data.type ??= 'creatureTypes';

    this.#configure('types', title, data, options);
  }

  configureBonus(bonusID, type = 'damage') {
    const dialogKey = CONFIG.A5E.bonusDialogKeys[type];
    if (!dialogKey) return;

    const dialogName = `${this.name} ${localize(CONFIG.A5E.bonusLabels[type]?.dialogName ?? type)}`;
    this.#configure(dialogKey, dialogName, { bonusID });
  }

  configureCreatureTerrains(data = {}, options = {}) {
    data.heading ??= 'A5E.CreatureTerrainsLabel';
    data.configObject ??= CONFIG.A5E.terrainTypes;
    data.propertyKey ??= 'system.details.terrain';
    data.type ??= 'creatureTerrains';

    this.#configure('terrain', `${this.name}: Configure Creature Terrains`, data, options);
  }

  configureDamageImmunities(data = {}, options = {}) {
    const title = localize('A5E.DamageImmunitiesConfigurationPrompt', { name: this.name });

    data.heading ??= 'A5E.DamageTypePlural';
    data.configObject ??= CONFIG.A5E.damageTypes;
    data.propertyKey ??= 'system.traits.damageImmunities';
    data.type ??= 'damageImmunities';

    this.#configure('damageImmunities', title, data, options);
  }

  configureDamageResistances(data = {}, options = {}) {
    const title = localize('A5E.DamageResistancesConfigurationPrompt', { name: this.name });

    data.heading ??= 'A5E.DamageTypePlural';
    data.configObject ??= CONFIG.A5E.damageTypes;
    data.propertyKey ??= 'system.traits.damageResistances';
    data.type ??= 'damageResistances';

    this.#configure('damageResistances', title, data, options);
  }

  configureDamageVulnerabilities(data = {}, options = {}) {
    const title = localize('A5E.DamageVulnerabilitiesConfigurationPrompt', { name: this.name });

    data.heading ??= 'A5E.DamageTypePlural';
    data.configObject ??= CONFIG.A5E.damageTypes;
    data.propertyKey ??= 'system.traits.damageVulnerabilities';
    data.type ??= 'damageVulnerabilities';

    this.#configure('damageVulnerabilities', title, data, options);
  }

  configureHealth(data = {}, options = {}) {
    const title = localize('A5E.HitPointsConfigurationPrompt', { name: this.name });
    options.width ??= 380;
    this.#configure('health', title, data, options);
  }

  configureInitiative(data = {}, options = {}) {
    const title = localize('A5E.InitiativeConfigurationPrompt', { name: this.name });
    this.#configure('initiative', title, data, { ...options, width: options.width ?? 432 });
  }

  configureLanguages(data = {}, options = {}) {
    const title = localize('A5E.LanguagesConfigurationPrompt', { name: this.name });

    data.heading ??= 'A5E.Languages';
    data.configObject ??= CONFIG.A5E.languages;
    data.propertyKey ??= 'system.proficiencies.languages';
    data.type ??= 'languages';

    this.#configure('languages', title, data, options);
  }

  configureMovement(data = {}, options = {}) {
    const title = localize('A5E.MovementConfigurationPrompt', { name: this.name });
    this.#configure('movement', title, data, options);
  }

  configureManeuverTraditions(data = {}, options = {}) {
    const title = localize('A5E.ManeuverTraditionsConfigurationPrompt', { name: this.name });

    data.heading ??= 'A5E.ManeuverTraditionPlural';
    data.configObject ??= CONFIG.A5E.maneuverTraditions;
    data.propertyKey ??= 'system.proficiencies.traditions';
    data.type ??= 'maneuverTraditions';

    this.#configure('maneuverTraditions', title, data, options);
  }

  configureSenses(data = {}, options = {}) {
    const title = localize('A5E.SensesConfigurationPrompt', { name: this.name });
    this.#configure('senses', title, data, options);
  }

  configureSizeCategory(data = {}, options = {}) {
    const title = localize('A5E.SizeCategoryConfigurationPrompt', { name: this.name });

    data.heading ??= 'A5E.SizeCategory';
    data.configObject ??= CONFIG.A5E.actorSizes;
    data.propertyKey ??= 'system.traits.size';
    data.type ??= 'size';

    this.#configure('size', title, data, options);
  }

  configureSkill(data = {}, options = { width: 440 }) {
    const title = localize(
      'A5E.SkillConfigurationPrompt',
      { name: this.name, skill: localize(CONFIG.A5E.skills[data.skillKey]) }
    );

    this.#configure('skill', title, data, options);
  }

  configureToolProficiencies(data = {}, options = {}) {
    const title = localize('A5E.ToolProficienciesConfigurationPrompt', { name: this.name });

    data.heading ??= 'A5E.ToolProficiencies';
    data.configObject ??= CONFIG.A5E.tools;
    data.propertyKey ??= 'system.proficiencies.tools';
    data.type ??= 'tools';

    this.#configure('tools', title, data, options);
  }

  configureWeaponProficiencies(data = {}, options = {}) {
    const title = localize('A5E.WeaponProficienciesConfigurationPrompt', { name: this.name });

    data.heading ??= 'A5E.WeaponPlural';
    data.configObject ??= CONFIG.A5E.weapons;
    data.propertyKey ??= 'system.proficiencies.weapons';
    data.type ??= 'weapons';

    this.#configure('weapons', title, data, options);
  }

  async deleteBonus(id, type = 'damage') {
    // Close dialog
    const dialog = this.dialogs.bonuses[id];
    await dialog?.close();
    delete this.dialogs.bonuses[id];

    await this.update({
      [`system.bonuses.${type}`]: {
        [`-=${id}`]: null
      }
    });
  }

  duplicateBonus(id, type = 'damage') {
    let defaultLabel;
    const bonuses = foundry.utils.duplicate(this._source.system.bonuses[type] ?? {});

    if (foundry.utils.isEmpty(bonuses)) return;

    const newBonus = foundry.utils.duplicate(
      this.system.bonuses[type][id]
    );

    if (type === 'damage') defaultLabel = localize('A5E.NewDamageBonus');
    else if (type === 'healing') defaultLabel = localize('A5E.NewHealingBonus');
    else defaultLabel = 'New Bonus';

    newBonus.label = `${newBonus.label || defaultLabel} (Copy)`;

    this.update({
      [`system.bonuses.${type}`]: {
        ...bonuses,
        [foundry.utils.randomID()]: newBonus
      }
    });
  }

  get isBloodied() {
    const { max, value } = this.system.attributes.hp;
    return (value / max) * 100 <= 50;
  }

  async modifyTokenAttribute(attribute, value, isDelta, isBar) {
    if (attribute === 'attributes.hp') {
      const hp = getProperty(this.system, attribute);
      const hpPool = hp.value + hp.temp;
      const delta = hpPool - value;

      if (isDelta) {
        return value <= 0 ? this.applyDamage(-1 * value) : this.applyHealing(value);
      }

      return delta <= 0 ? this.applyHealing(-1 * delta) : this.applyDamage(delta);
    }

    return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
  }

  async recoverExertionUsingHitDice() {
    const { current, max } = this.system.attributes.exertion;

    const [lowestAvailableHitDie] = Object.entries(this.system.attributes.hitDice).find(
      // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
      ([_, { current: c, total: t }]) => c > 0 && t > 0
    );

    if (!lowestAvailableHitDie) {
      ui.notifications.warn(`${this.name} has no hit dice remaining.`);
      return;
    }

    const roll = await new Roll('1d4');

    // TODO: Make the message prettier
    await roll.toMessage();
    const newExertion = Math.min((current ?? 0) + roll.total, max);
    const newHitDieCount = this.system.attributes.hitDice[lowestAvailableHitDie].current - 1;

    await this.update({
      'system.attributes': {
        'exertion.current': newExertion,
        [`hitDice.${lowestAvailableHitDie}.current`]: newHitDieCount
      }
    });
  }

  /**
   * Rolls an ability check for a given skill. A dialog is presented to the user so that they can
   * perform choose the size of the expertise die to use for the check.
   *
   * @async
   * @method
   * @param {string} abilityKey A key that can be used to reference a given ability score.
   * @returns {Object}
   */
  async rollAbilityCheck(abilityKey, options = {}) {
    let dialogData;

    if (options.skipRollDialog) dialogData = this.getDefaultAbilityCheckData(abilityKey, options);
    else dialogData = await this.#showAbilityCheckPrompt(abilityKey, options);

    if (!dialogData) return null;

    const {
      expertiseDie, rollFormula, rollMode, visibilityMode
    } = dialogData;

    const rollPreparationManager = new RollPreparationManager({
      actor: this,
      rolls: [
        {
          ability: abilityKey,
          expertiseDie,
          rollFormula,
          rollMode,
          type: 'abilityCheck'
        }
      ]
    });

    const rolls = await rollPreparationManager.prepareRolls();

    const chatData = {
      user: game.user?.id,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      sound: CONFIG.sounds.dice,
      rolls: rolls.map(({ roll }) => roll),
      rollMode: visibilityMode ?? game.settings.get('core', 'rollMode'),
      flags: {
        a5e: {
          actorId: this.uuid,
          cardType: 'abilityCheck',
          img: this.token?.img ?? this.img,
          name: this.name,
          rollData: rolls.map(({ roll, ...rollData }) => rollData)
        }
      },
      content: '<article></article>'
    };

    const hookData = {
      abilityKey, expertiseDie, rollFormula, rollMode
    };

    Hooks.callAll('a5e.rollAbilityCheck', this, hookData, rolls);

    const chatCard = await ChatMessage.create(chatData);
    return chatCard;
  }

  getDefaultAbilityCheckData(abilityKey, options = {}) {
    const ability = this.system.abilities[abilityKey];
    const defaultRollMode = options?.rollMode ?? CONFIG.A5E.ROLL_MODE.NORMAL;
    const expertiseDie = options.expertiseDice ?? ability.check.expertiseDice;

    const rollMode = this.RollOverrideManager.getRollOverride(
      `system.abilities.${abilityKey}.check`,
      defaultRollMode
    );

    const rollFormula = getRollFormula(this, {
      ability: abilityKey,
      expertiseDie,
      rollMode,
      situationalMods: options.situationalMods,
      selectedAbilityBonuses: this.BonusesManager.getDefaultSelections(
        'abilities',
        { abilityKey, abilityType: 'check' }
      ),
      type: 'abilityCheck'
    });

    return { expertiseDie, rollFormula, visibilityMode: options.visibilityMode ?? null };
  }

  async #showAbilityCheckPrompt(abilityKey, rollOptions = {}, dialogOptions = {}) {
    const title = localize(
      'A5E.AbilityCheckPromptTitle',
      { name: this.name, ability: localize(CONFIG.A5E.abilities[abilityKey]) }
    );

    const dialog = new GenericRollDialog(
      this,
      title,
      AbilityCheckRollDialog,
      { abilityKey },
      rollOptions,
      dialogOptions
    );

    await dialog.render(true);
    const dialogData = await dialog.promise;

    return dialogData;
  }

  async rollDeathSavingThrow(options = {}) {
    options.saveType = 'death';
    options.expertiseDice ??= 0;
    options.visibilityMode ??= 'gmroll';

    if (game.settings.get('a5e', 'blindDeathSaves')) {
      options.visibilityMode = 'blindroll';
    }

    this.rollSavingThrow(null, options);
  }

  async rollHitDice(dieSize, quantity = 1) {
    const actorData = this.system;
    const { attributes } = actorData;

    if (attributes.hitDice[dieSize].current - quantity < 0) return null;

    const title = localize('A5E.HitDiceChatHeader', { dieSize: dieSize.toUpperCase() });

    const conMod = parseInt(actorData.abilities.con.check.mod, 10);
    const formula = `${quantity}${dieSize} + ${quantity * conMod}`;

    const roll = await new Roll(formula).roll({ async: true });

    const chatData = {
      user: game.user?.id,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      sound: CONFIG.sounds.dice,
      rolls: [roll],
      flags: {
        a5e: {
          actorId: this.uuid,
          // cardType: 'hitDice',
          img: this.token?.img ?? this.img,
          name: this.name,
          title
        }
      }
      // content: '<article></article>'
    };

    const hpDelta = Math.max(roll.total, 0);
    const maxHp = attributes.hp.baseMax + attributes.hp.bonus;

    this.update({
      'data.attributes': {
        [`hitDice.${dieSize}.current`]: attributes.hitDice[dieSize].current - quantity
      }
    });

    // Apply healing
    this.applyHealing(hpDelta);
    const chatCard = await ChatMessage.create(chatData);

    Hooks.callAll('a5e.rollHitDice', this, {
      dieSize,
      dieCount: (attributes.hitDice[dieSize].current - quantity),
      formula,
      newHp: Math.min(attributes.hp.value + hpDelta, maxHp),
      roll,
      quantity
    });

    return chatCard;
  }

  async rollSavingThrow(abilityKey, options = {}) {
    let dialogData;

    if (options.skipRollDialog) dialogData = this.getDefaultSavingThrowData(abilityKey, options);
    else dialogData = await this.#showSavingThrowPrompt(abilityKey, options);

    if (dialogData === null) return null;

    const {
      expertiseDie, rollFormula, rollMode, saveType, visibilityMode
    } = dialogData;

    const rollPreparationManager = new RollPreparationManager({
      actor: this,
      rolls: [
        {
          ability: abilityKey,
          expertiseDie,
          rollFormula,
          rollMode,
          saveType,
          type: 'savingThrow'
        }
      ]
    });

    const rolls = await rollPreparationManager.prepareRolls();

    const chatData = {
      user: game.user?.id,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      sound: CONFIG.sounds.dice,
      rolls: rolls.map(({ roll }) => roll),
      rollMode: visibilityMode ?? game.settings.get('core', 'rollMode'),
      flags: {
        a5e: {
          actorId: this.uuid,
          cardType: 'savingThrow',
          img: this.token?.img ?? this.img,
          name: this.name,
          rollData: rolls.map(({ roll, ...rollData }) => rollData)
        }
      },
      content: '<article></article>'
    };

    const hookData = {
      abilityKey, expertiseDie, rollFormula, rollMode
    };

    if (options?.saveType === 'death') {
      Hooks.callAll('a5e.rollDeathSavingThrow', this, hookData, rolls);
      this.updateDeathSavingThrowFigures(rolls.map(({ roll }) => roll)[0]);
    } else {
      Hooks.callAll('a5e.rollSavingThrow', this, hookData, rolls);
    }

    const chatCard = await ChatMessage.create(chatData);
    return chatCard;
  }

  getDefaultSavingThrowData(abilityKey, options = {}) {
    const ability = this.system.abilities[abilityKey];
    const defaultRollMode = options?.rollMode ?? CONFIG.A5E.ROLL_MODE.NORMAL;
    const expertiseDie = options.expertiseDice ?? ability?.save.expertiseDice ?? 0;

    const rollOverrideKey = abilityKey ? `system.abilities.${abilityKey}.save` : 'deathSave';
    const rollMode = this.RollOverrideManager.getRollOverride(rollOverrideKey, defaultRollMode);

    const rollFormula = getRollFormula(this, {
      ability: abilityKey,
      expertiseDie,
      rollMode,
      saveType: options.saveType,
      situationalMods: options.situationalMods,
      selectedAbilityBonuses: this.BonusesManager.getDefaultSelections(
        'abilities',
        { abilityKey, abilityType: 'save' }
      ),
      type: 'savingThrow'
    });

    return { expertiseDie, rollFormula, visibilityMode: options.visibilityMode ?? null };
  }

  async #showSavingThrowPrompt(abilityKey, rollOptions = {}, dialogOptions = {}) {
    let title;

    if (rollOptions.saveType === 'death') {
      title = localize(
        'A5E.DeathSavingThrowPromptTitle',
        { name: this.name }
      );
    } else {
      title = localize(
        'A5E.SavingThrowPromptTitle',
        { name: this.name, ability: localize(CONFIG.A5E.abilities[abilityKey]) }
      );
    }

    const dialog = new GenericRollDialog(
      this,
      title,
      SavingThrowRollDialog,
      { abilityKey },
      rollOptions,
      dialogOptions
    );

    await dialog.render(true);
    const dialogData = await dialog.promise;

    return dialogData;
  }

  /**
   * Rolls a skill check for a given skill. A dialog is presented to the user so that they can
   * perform additional configuration, such as choosing an ability score for the check.
   *
   * @async
   * @method
   * @param {string} skillKey A key that can be used to reference a given skill.
   * @param {object}
   *
   * @returns {Promise<undefined>}
   */
  async rollSkillCheck(skillKey, options = {}) {
    let dialogData;

    if (options.skipRollDialog) dialogData = this.getDefaultSkillCheckData(skillKey, options);
    else dialogData = await this.#showSkillCheckPrompt(skillKey, options);

    if (!dialogData) return null;

    const {
      abilityKey, expertiseDie, rollFormula, rollMode, visibilityMode
    } = dialogData;

    const rollPreparationManager = new RollPreparationManager({
      actor: this,
      rolls: [
        {
          ability: abilityKey,
          expertiseDie,
          rollFormula,
          rollMode,
          skill: skillKey,
          type: 'skillCheck'
        }
      ]
    });

    const rolls = await rollPreparationManager.prepareRolls();

    const chatData = {
      user: game.user?.id,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      sound: CONFIG.sounds.dice,
      rolls: rolls.map(({ roll }) => roll),
      rollMode: visibilityMode ?? game.settings.get('core', 'rollMode'),
      flags: {
        a5e: {
          actorId: this.uuid,
          cardType: 'skillCheck',
          img: this.token?.img ?? this.img,
          name: this.name,
          rollData: rolls.map(({ roll, ...rollData }) => rollData)
        }
      },
      content: '<article></article>'
    };

    const hookData = {
      abilityKey, expertiseDie, rollFormula, rollMode, skillKey
    };

    Hooks.callAll('a5e.rollSkillCheck', this, hookData, rolls);

    const chatCard = await ChatMessage.create(chatData);
    return chatCard;
  }

  getDefaultSkillCheckData(skillKey, options = {}) {
    const skill = this.system.skills[skillKey];
    const abilityKey = options?.abilityKey ?? skill.ability;
    const defaultRollMode = options?.rollMode ?? CONFIG.A5E.ROLL_MODE.NORMAL;
    const expertiseDie = options.expertiseDice ?? skill.expertiseDice;

    const rollMode = this.RollOverrideManager
      .getRollOverride(`system.skills.${skillKey}`, defaultRollMode, { ability: abilityKey });

    const rollFormula = getRollFormula(this, {
      ability: abilityKey,
      expertiseDie,
      minRoll: options.minRoll ?? skill.minRoll,
      proficient: skill.proficient,
      type: 'skillCheck',
      rollMode,
      skill: skillKey,
      selectedAbilityBonuses: this.BonusesManager.getDefaultSelections(
        'abilities',
        { abilityKey, abilityType: 'check' }
      ),
      selectedSkillBonuses: this.BonusesManager.getDefaultSelections(
        'skills',
        { skillKey, abilityKey }
      ),
      situationalMods: options.situationalMods
    });

    return {
      abilityKey, expertiseDie, rollFormula, visibilityMode: options.visibilityMode ?? null
    };
  }

  async #showSkillCheckPrompt(skillKey, rollOptions = {}, dialogOptions = {}) {
    const title = localize(
      'A5E.SkillPromptTitle',
      { name: this.name, skill: localize(CONFIG.A5E.skills[skillKey]) }
    );

    const dialog = new GenericRollDialog(
      this,
      title,
      SkillCheckRollDialog,
      { skillKey },
      rollOptions,
      dialogOptions
    );

    await dialog.render(true);
    const dialogData = await dialog.promise;

    return dialogData;
  }

  toggleElite() {
    this.update({ 'system.details.elite': !this.system.details.elite });
  }

  toggleInspiration() {
    const currentState = this.system.attributes.inspiration;
    this.update({ 'system.attributes.inspiration': !currentState });

    if (currentState) {
      Hooks.callAll('a5e.inspirationUsed', this);
    } else {
      Hooks.callAll('a5e.inspirationGained', this);
    }
  }

  /**
   *
   * @param {Object} restOptions
   * @param {Boolean} restOptions.consumeSupply
   * @param {Boolean} restOptions.haven
   * @param {Boolean} restOptions.recoverStrifeAndFatigue
   * @param {'long' | 'short'} restOptions.restType
   * @returns
   */
  async triggerRest(restOptions = {}) {
    let restData;
    if (foundry.utils.isEmpty(restOptions)) {
      const title = localize('A5E.RestConfigurationPrompt', { name: this.name });
      const dialog = new GenericConfigDialog(this, title, RestDialog);
      await dialog.render(true);
      restData = await dialog?.promise;
    } else {
      restData = foundry.utils.mergeObject({
        consumeSupply: false,
        haven: true,
        recoverStrifeAndFatigue: true,
        restType: 'short'
      }, restOptions);
    }

    if (!restData) return;
    const restManger = new RestManager(this, restData);

    await restManger.restoreResources();
  }

  async updateDeathSavingThrowFigures(roll) {
    const { death, fatigue, strife } = this.system.attributes;
    const { success, failure } = death;
    const d20Result = roll.dice[0].total;

    const updates = {
      'system.attributes.death': { success, failure }
    };

    if (d20Result === 1) {
      if (game.settings.get('a5e', '5eStyleDeathSaves')) {
        updates['system.attributes.death'].failure += 2;
      } else {
        updates['system.attributes.death'].failure += 1;
        updates['system.attributes.fatigue'] = fatigue + 1;
        updates['system.attributes.strife'] = strife + 1;
      }
    } else if (d20Result === 20) updates['system.attributes.hp.value'] = 1;
    else if (d20Result < 10) updates['system.attributes.death'].failure += 1;
    else updates['system.attributes.death'].success += 1;

    await this.update(updates);
  }

  async rechargeGenericResource(resource) {
    if (!this.system.resources[resource]) return;

    // eslint-disable-next-line max-len
    const max = getDeterministicBonus(this.system.resources[resource].max, this.getRollData());
    const current = this.system.resources[resource].value;
    const formula = this.system.resources[resource]?.recharge?.formula || '1d6';
    const threshold = this.system.resources[resource]?.recharge?.threshold || 6;
    const rechargeType = this.system.resources[resource]?.recharge?.rechargeType || 'custom';
    const rechargeAmount = this.system.resources[resource]?.recharge?.rechargeAmount || '1';
    const updatePath = `system.resources.${resource}.value`;

    // Recharge Roll
    const rechargeRoll = await new Roll(formula, this.getRollData()).evaluate({ async: true });

    // TODO: Make the message prettier
    rechargeRoll.toMessage();

    if (rechargeRoll.total < threshold) return;

    if (rechargeType === 'min') await this.update({ [updatePath]: 0 });
    else if (rechargeType === 'max') await this.update({ [updatePath]: max });
    else {
      const rechargeAmountRoll = await new Roll(
        rechargeAmount,
        this.getRollData()
      ).evaluate({ async: true });

      // TODO: Add the roll back in when the custom recharge amount config is added.
      // rechargeAmountRoll.toMessage();

      await this.update({ [updatePath]: Math.min(max, current + rechargeAmountRoll.total) });
    }
  }
}
