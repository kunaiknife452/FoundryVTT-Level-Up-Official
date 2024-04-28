import type {
  AbilityBonusContext,
  AttackBonusContext,
  DamageBonusContext,
  HealingBonusContext,
  HitPointsBonusContext,
  InitiativeBonusContext,
  MovementBonusContext,
  SensesBonusContext,
  SkillBonusContext
} from './contexts';

export interface AbilityBonus {
  context: AbilityBonusContext;
  formula: string;
  label: string;
  img: string;
  default: boolean;
  defaultLabel?: string;
}

export interface AttackBonus {
  context: AttackBonusContext;
  formula: string;
  label: string;
  img: string;
  default: boolean;
  defaultLabel?: string;
}

export interface DamageBonus {
  context: DamageBonusContext;
  damageType: string;
  formula: string;
  label: string;
  img: string;
  default: boolean;
  defaultLabel?: string;
}

export interface ExertionBonus {
  formula: string;
  label: string;
  img: string;
}

export interface HealingBonus {
  context: HealingBonusContext;
  healingType: string;
  formula: string;
  label: string;
  img: string;
  default: boolean;
  defaultLabel?: string;
}

export interface HitPointsBonus {
  context: HitPointsBonusContext,
  formula: string;
  label: string;
  img: string;
  default: boolean;
  defaultLabel?: string;
}

export interface InitiativeBonus {
  context: InitiativeBonusContext;
  formula: string;
  label: string;
  default: boolean;
  defaultLabel?: string;
  img: string;
}

export interface MovementBonus {
  context: MovementBonusContext;
  unit: string;
  formula: string;
  label: string;
  defaultLabel?: string;
  img: string;
}

export interface SensesBonus {
  context: SensesBonusContext;
  unit: string;
  formula: string;
  label: string;
  defaultLabel?: string;
  img: string;
}

export interface SkillBonus {
  context: SkillBonusContext;
  formula: string;
  label: string;
  img: string;
  default: boolean;
  defaultLabel?: string;
}

export interface Bonuses {
  abilities: { [id: string]: AbilityBonus };
  attacks: { [id: string]: AttackBonus };
  damage: { [id: string]: DamageBonus };
  exertion: { [id: string]: ExertionBonus };
  healing: { [id: string]: HealingBonus };
  hitPoint: { [id: string]: HitPointsBonus };
  initiative: { [id: string]: InitiativeBonus };
  movement: { [id: string]: MovementBonus };
  senses: { [id: string]: SensesBonus };
  skills: { [id: string]: SkillBonus };
  maneuverDC: string;
  meleeWeaponAttack: string;
  meleeSpellAttack: string;
  rangedWeaponAttack: string;
  rangedSpellAttack: string;
  spellDC: string;
}
