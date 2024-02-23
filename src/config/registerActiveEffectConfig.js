export default function registerActiveEffectConfig(A5E) {
  A5E.ACTIVE_EFFECT_MODES = {
    CUSTOM: 0,
    MULTIPLY: 1,
    ADD: 2,
    SUBTRACT: 3,
    DOWNGRADE: 4,
    UPGRADE: 5,
    OVERRIDE: 6,
    CONDITIONAL: 7
  };

  A5E.activeEffectTypes = {
    onUse: 'A5E.effects.types.plural.onUse',
    ongoing: 'A5E.effects.types.plural.ongoing',
    inactive: 'A5E.effects.types.plural.inactive',
    passive: 'A5E.effects.types.plural.passive',
    temporary: 'A5E.effects.types.plural.temporary'
  };

  A5E.conditionIconsDefault = {
    blinded: 'icons/svg/blind.svg',
    bloodied: 'icons/svg/blood.svg',
    charmed: 'systems/a5e/assets/icons/charmed.svg',
    concentration: 'systems/a5e/assets/icons/concentration.svg',
    confused: 'systems/a5e/assets/icons/confused.svg',
    deafened: 'icons/svg/deaf.svg',
    dead: 'icons/svg/skull.svg',
    doomed: 'systems/a5e/assets/icons/doomed.svg',
    encumbered: 'systems/a5e/assets/icons/encumbered.svg',
    fatigue: 'systems/a5e/assets/icons/fatigue.svg',
    frightened: 'icons/svg/terror.svg',
    grappled: 'systems/a5e/assets/icons/grappled.svg',
    incapacitated: 'systems/a5e/assets/icons/incapacitated.svg',
    invisible: 'icons/svg/invisible.svg',
    paralyzed: 'icons/svg/paralysis.svg',
    petrified: 'systems/a5e/assets/icons/petrified.svg',
    poisoned: 'icons/svg/poison.svg',
    prone: 'icons/svg/falling.svg',
    rattled: 'systems/a5e/assets/icons/rattled.svg',
    restrained: 'icons/svg/net.svg',
    slowed: 'systems/a5e/assets/icons/slowed.svg',
    strife: 'systems/a5e/assets/icons/strife.svg',
    stunned: 'icons/svg/daze.svg',
    unconscious: 'icons/svg/unconscious.svg'
  };
  // eslint-disable-next-line no-return-assign
  Array.from({ length: 10 }, (_, i) => (A5E.conditionIconsDefault[`generic${i + 1}`] = `systems/a5e/assets/icons/circle${i + 1}.svg`));

  A5E.actionActiveEffectTypes = {
    onUse: 'A5E.effects.types.singular.onUse'
  };

  A5E.actionActiveEffectTypesPlural = {
    onUse: 'A5E.effects.types.plural.onUse'
  };

  A5E.itemActiveEffectTypes = {
    passive: 'A5E.effects.types.singular.passive'
  };

  A5E.itemActiveEffectTypesPlural = {
    passive: 'A5E.effects.types.plural.passive'
  };

  A5E.effectDurationTypes = {
    seconds: 'A5E.effects.durationTypes.plural.seconds',
    rounds: 'A5E.effects.durationTypes.plural.roundsAndTurns'
  };

  A5E.effectDurationUnits = {
    seconds: 'A5E.effects.durationUnits.plural.seconds',
    minutes: 'A5E.effects.durationUnits.plural.minutes',
    hours: 'A5E.effects.durationUnits.plural.hours'
  };
}
