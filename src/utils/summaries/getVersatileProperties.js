import { localize } from '#runtime/svelte/helper';

export default function getVersatileProperties(item) {
  const { versatileOptions, weaponProperties } = CONFIG.A5E;

  if (item.system.versatile) {
    const versatile = versatileOptions[item.system.versatile];

    return localize(
      'A5E.weaponProperties.versatileSpecific',
      { die: versatile }
    );
  }

  return weaponProperties.versatile;
}
