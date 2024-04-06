export default function prepareCreatureHeight(actor) {
  return [CONFIG.A5E.actorHeights[actor.system.traits.height]].map((height) => game.i18n.localize(height));
}
