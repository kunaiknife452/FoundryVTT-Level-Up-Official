import { localize } from '#runtime/svelte/helper';

import getExpertiseDieSize from '../utils/getExpertiseDieSize';

export default class ModifierManager {
  constructor(actor, rollData) {
    this.actor = actor;
    this.rollData = rollData;
  }

  getModifiers() {
    switch (this.rollData.type) {
      case 'abilityCheck':
        return this.#getAbilityCheckModifiers().filter(Boolean);
      case 'attack':
        return this.#getAttackRollModifiers().filter(Boolean);
      case 'initiative':
        return this.#getInitiativeRollModifiers().filter(Boolean);
      case 'savingThrow':
        return this.#getSavingThrowModifiers().filter(Boolean);
      case 'skillCheck':
        return this.#getSkillCheckModifiers().filter(Boolean);
      default:
        return [];
    }
  }

  #getAbilityCheckModifiers() {
    return [
      this.#getAbilityModifier(),
      this.#getAbilityCheckBonus(),
      this.#getExpertiseDice(),
      this.#getSituationalModifiers()
    ];
  }

  #getAttackRollModifiers() {
    return [
      this.#getProficiencyBonus(),
      this.#getAbilityModifier(),
      this.#getAttackBonus(),
      this.#getGlobalAttackBonus(),
      this.#getExpertiseDice(),
      this.#getSituationalModifiers()
    ];
  }

  #getInitiativeRollModifiers() {
    return [
      this.#getInitiativeBonus(),
      ...this.#getSkillCheckModifiers()
    ];
  }

  #getSavingThrowModifiers() {
    return [
      this.#getAbilitySaveModifier(),
      this.#getAbilitySaveBonus(),
      this.#getConcentrationBonus(),
      this.#getExpertiseDice(),
      this.#getSituationalModifiers()
    ];
  }

  #getSkillCheckModifiers() {
    return [
      this.#getSkillCheckModifier(),
      this.#getAbilityModifier(),
      this.#getSkillCheckBonus(),
      this.#getAbilityCheckBonus(),
      this.#getExpertiseDice(),
      this.#getSituationalModifiers()
    ];
  }

  #getAbilityCheckBonus() {
    const { ability, selectedAbilityBonuses } = this.rollData;
    if (!ability) return null;

    let value;
    if (selectedAbilityBonuses) {
      value = this.actor.BonusesManager.getSelectedBonusesFormula('abilities', selectedAbilityBonuses);
    } else {
      value = this.actor.BonusesManager.getAbilityBonusesFormula(ability, 'check');
    }

    return {
      label: localize('A5E.AbilityCheckBonus', {
        ability: CONFIG.A5E.abilities[ability]
      }),
      value: value || null
    };
  }

  #getAbilityModifier() {
    const { ability } = this.rollData;

    if (!ability) return null;

    return {
      label: localize('A5E.AbilityCheckMod', {
        ability: CONFIG.A5E.abilities[ability] ?? ability
      }),
      value: this.actor.system.abilities[ability]?.mod ?? null
    };
  }

  #getAbilitySaveBonus() {
    const { ability, selectedAbilityBonuses } = this.rollData;
    if (!ability) return null;

    let value;
    if (selectedAbilityBonuses) {
      value = this.actor.BonusesManager.getSelectedBonusesFormula('abilities', selectedAbilityBonuses);
    } else {
      value = this.actor.BonusesManager.getAbilityBonusesFormula(ability, 'save');
    }

    return {
      label: localize('A5E.AbilitySaveBonus', {
        ability: CONFIG.A5E.abilities[ability]
      }),
      value: value || null
    };
  }

  #getAbilitySaveModifier() {
    const { ability } = this.rollData;

    if (!ability) return null;

    return {
      label: localize('A5E.AbilitySaveMod', {
        ability: CONFIG.A5E.abilities[ability] ?? ability
      }),
      value: this.actor.system.abilities[ability]?.save.mod ?? null
    };
  }

  #getAttackBonus() {
    return {
      label: localize('A5E.AttackBonus'),
      value: this.rollData.attackBonus ?? 0
    };
  }

  #getConcentrationBonus() {
    if (this.rollData.saveType !== 'concentration') return null;

    return {
      label: localize('A5E.ConcentrationBonus'),
      value: this.actor.system.abilities.con.save.concentrationBonus
    };
  }

  #getExpertiseDice() {
    return {
      label: localize('A5E.ExpertiseDie'),
      value: getExpertiseDieSize(this.rollData?.expertiseDie ?? 0)
    };
  }

  #getGlobalAttackBonus() {
    const { BonusesManager } = this.actor;
    const { attackType, item, selectedAttackBonuses } = this.rollData;

    let value;

    if (selectedAttackBonuses) {
      value = BonusesManager.getSelectedBonusesFormula('attacks', selectedAttackBonuses);
    } else {
      value = BonusesManager.getAttackBonusFormula(item, attackType);
    }

    switch (attackType) {
      case 'meleeSpellAttack':
        return { label: localize('A5E.BonusMeleeSpellAttack'), value };
      case 'meleeWeaponAttack':
        return { label: localize('A5E.BonusMeleeWeaponAttack'), value };
      case 'rangedSpellAttack':
        return { label: localize('A5E.BonusRangedSpellAttack'), value };
      case 'rangedWeaponAttack':
        return { label: localize('A5E.BonusRangedWeaponAttack'), value };
      default:
        return null;
    }
  }

  #getInitiativeBonus() {
    const { ability, selectedInitiativeBonuses, skill } = this.rollData;

    let value;
    if (selectedInitiativeBonuses) {
      value = this.actor.BonusesManager.getSelectedBonusesFormula('initiative', selectedInitiativeBonuses);
    } else {
      value = this.actor.BonusesManager.getInitiativeBonusFormula(
        { abilityKey: ability, skillKey: skill }
      );
    }

    return {
      label: localize('A5E.InitiativeBonus'),
      value: value || null
    };
  }

  #getProficiencyBonus() {
    if (!this.rollData.proficient) return null;

    return {
      label: localize('A5E.ProficiencyBonusAbbr'),
      value: this.actor.system.attributes.prof
    };
  }

  #getSkillCheckModifier() {
    const { skill } = this.rollData;

    if (!skill) return null;

    return {
      label: localize('A5E.SkillCheckMod', { skill: CONFIG.A5E.skills[skill] }),
      value: this.actor.system.skills[skill]?.mod ?? null
    };
  }

  #getSkillCheckBonus() {
    const { ability, selectedSkillBonuses, skill } = this.rollData;
    if (!skill) return null;

    let value;
    if (selectedSkillBonuses) {
      value = this.actor.BonusesManager.getSelectedBonusesFormula('skills', selectedSkillBonuses);
    } else {
      value = this.actor.BonusesManager.getSkillBonusesFormula(skill, ability);
    }

    return {
      label: localize('A5E.SkillCheckBonus', { skill: CONFIG.A5E.skills[skill] }),
      value: value || null
    };
  }

  #getSituationalModifiers() {
    return { value: this.rollData.situationalMods };
  }
}
