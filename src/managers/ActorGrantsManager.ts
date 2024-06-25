/* eslint-disable @typescript-eslint/return-await */
/* eslint-disable no-param-reassign */
import type { ActorGrant, TraitGrant } from 'types/actorGrants';
import type { Grant } from 'types/itemGrants';

import actorGrants from '../dataModels/actor/grants';

import GenericDialog from '../apps/dialogs/initializers/GenericDialog';
import GrantApplicationDialog from '../apps/dialogs/GrantApplicationDialog.svelte';

import prepareGrantsApplyData from '../utils/prepareGrantsApplyData';
import prepareProficiencyConfigObject from '../utils/prepareProficiencyConfigObject';
import prepareTraitGrantConfigObject from '../utils/prepareTraitGrantConfigObject';
import fromUuidMulti from '../utils/fromUuidMulti';

interface DefaultApplyOptions {
  item?: typeof Item;
  cls?: typeof Item;
  clsLevel?: number;
  useUpdateSource?: boolean;
}

export default class ActorGrantsManger extends Map<string, ActorGrant> {
  private actor: typeof Actor;

  private allowedTypes = ['feature', 'background', 'class', 'culture', 'heritage'];

  grantedFeatureDocuments = new Map<string, string[]>();

  constructor(actor: typeof Actor) {
    super();

    this.actor = actor;

    const grantsData: Record<string, ActorGrant> = this.actor.system.grants ?? {};
    Object.entries(grantsData).forEach(([id, data]) => {
      data.grantId ??= id;
      let Cls = actorGrants[data.grantType];

      // eslint-disable-next-line no-console
      if (!Cls) console.warn(`Grant ${id} has no class mapping.`);
      Cls ??= actorGrants.base;
      const grant: any = new Cls(data, { parent: actor });

      this.set(id, grant);
    });

    // Aggregate granted documents
    [...this.values()].forEach((grant) => {
      if (!(grant instanceof actorGrants.feature)) return;

      const { documentIds } = grant;
      documentIds.forEach((id) => {
        if (!this.grantedFeatureDocuments.has(id)) {
          this.grantedFeatureDocuments.set(id, []);
        }

        this.grantedFeatureDocuments.get(id)?.push(grant.grantId);
      });
    });
  }

  byType(type: string): ActorGrant[] {
    return [...this.values()].filter((grant) => grant.grantType === type);
  }

  // *************************************************************
  // Data Retrieval Methods
  // *************************************************************
  getGrantedTraits(type: string): Record<string, any> {
    const grants = this.byType('trait') as TraitGrant[];

    return grants.reduce((acc, grant) => {
      if (grant.traitData.traitType !== type) return acc;

      acc[grant.grantId] = {
        itemId: grant.itemUuid,
        traits: grant.traitData.traits
      };

      return acc;
    }, {});
  }

  // *************************************************************
  // Update Methods
  // *************************************************************
  async createInitialGrants(item: typeof Item, isPreCreate = false): Promise<void> {
    if (!item) return;
    if (!this.allowedTypes.includes(item.type)) return;

    const applicableGrants: Grant[] = [];
    const optionalGrants: Grant[] = [];

    const classes = Object.keys(this.actor.levels.classes);
    const characterLevel: number = classes.length
      ? this.actor.levels.character + 1
      : this.actor.levels.character;

    const classLevel: number = this.actor.levels.classes?.[item?.slug] ?? 1;

    const grants: Grant[] = [...item.grants.values()];
    grants.forEach((grant) => {
      grant.grantedBy = { id: '', selectionId: '' };
    });

    // Get all applicable grants
    const subGrants: Grant[] = (await Promise.all(
      grants.map((grant) => this.#getSubGrants(grant, characterLevel))
    )).flat().filter((g) => !!g);

    grants.concat(subGrants).forEach((grant) => {
      if (this.has(grant._id)) return;

      const { levelType } = grant;
      if (levelType === 'character' && grant.level > characterLevel) return;
      if (levelType === 'class' && grant.level > classLevel) return;

      if (grant.optional) optionalGrants.push(grant);
      applicableGrants.push(grant);
    });

    const cls = item.type === 'class' ? item : null;
    await this.#applyGrants(
      applicableGrants,
      optionalGrants,
      {
        item,
        cls,
        clsLevel: characterLevel,
        useUpdateSource: isPreCreate
      }
    );
  }

  async createLeveledGrants(
    currentLevel: number = 0,
    newLevel: number = 0,
    cls: typeof Item | null = null
  ): Promise<boolean> {
    const difference = newLevel - currentLevel;
    const sign = Math.sign(difference);
    const characterLevel: number = this.actor.levels.character + difference;

    if (sign === 0) return false;
    if (sign === -1) {
      const clsSlug = cls?.slug || '';
      const clsLevel = (this.actor.levels.classes?.[clsSlug] ?? 1) + difference;
      if (clsLevel < 1) {
        await cls?.sheet?.close();
        cls.delete();
        return true;
      }

      await this.removeGrantsByClassLevel(clsLevel, clsSlug);
      return await this.removeGrantsByLevel(characterLevel);
    }

    const applicableGrants: Grant[] = [];
    const optionalGrants: Grant[] = [];

    const items = this.actor.items
      .filter((item: typeof Item) => this.allowedTypes.includes(item.type));

    for await (const item of items) {
      const itemSlug = item.slug || item.system.classes?.slugify() || '';
      let classLevel: number = this.actor.levels.classes?.[itemSlug] ?? 1;
      if (itemSlug === cls?.slug) classLevel += difference;

      const grants = [...item.grants.values()];
      grants.forEach((grant: Grant) => {
        grant.grantedBy = { id: '', selectionId: '' };
      });

      const subGrants: Grant[] = (await Promise.all(
        grants.map((grant) => this.#getSubGrants(grant, characterLevel))
      )).flat().filter((g) => !!g);

      grants.concat(subGrants).forEach((grant: Grant) => {
        let reSelectable = false;

        if (grant.grantedBy?.id) {
          const parentGrant = item.grants.get(grant.grantedBy.id)
            ?? applicableGrants.find((g) => g._id === grant.grantedBy?.id);

          reSelectable = this.#isReSelectable(parentGrant);
        }

        if (this.has(grant._id) && !reSelectable) return;
        if (this.has(grant.grantedBy?.id || '') && !reSelectable) return;

        const { levelType } = grant;
        if (levelType === 'character' && grant.level > characterLevel) return;
        if (levelType === 'class' && grant.level > classLevel) return;

        if (applicableGrants.find((g) => g._id === grant._id)) return;
        if (
          grant.grantedBy?.id
          && !applicableGrants.find((g) => g._id === grant.grantedBy?.id)
        ) return;

        if (grant.optional) {
          // Infer if the grant has been offered before
          const isCurrentLevel = levelType === 'class'
            ? grant.level === classLevel
            : grant.level === characterLevel;

          if (!isCurrentLevel && !grant.grantedBy?.id && !reSelectable) return;

          optionalGrants.push(grant);
        }

        applicableGrants.push(grant);
      });
    }

    const result = await this.#applyGrants(
      applicableGrants,
      optionalGrants,
      { cls, clsLevel: characterLevel, useUpdateSource: false }
    );

    return result;
  }

  #isReSelectable(grant: Grant | null): boolean {
    if (!grant) return false;
    if (grant.grantType !== 'feature') return false;

    const { features } = grant;
    return features.base.concat(features.options)
      .some((f) => !f.limitedReselection || f.selectionLimit > 1);
  }

  async #getSubGrants(grant: Grant, characterLevel: number): Promise<Grant[]> {
    if (grant.grantType !== 'feature') return [];
    if (grant.level > characterLevel) return [];

    const docIds: string[] = [...grant.features.base, ...grant.features.options].map((f) => f.uuid);
    let docs = await fromUuidMulti(docIds, { parent: this.actor });

    docs = docs.filter((d: any) => {
      if (!d) {
        ui.notifications?.error(`Grant ${grant.label} has an invalid document reference.`);
        return false;
      }

      return true;
    });

    const grants: Grant[] = docs.flatMap((doc) => [...doc.grants.values()]
      .map((g) => {
        const hasSelectionId = !!grant.features.options.length;
        g.grantedBy = { id: grant._id, selectionId: hasSelectionId ? doc.flags.core.sourceId : '' };
        return g;
      }));

    const subGrants: Grant[] = (await Promise.all(
      grants.map((g) => this.#getSubGrants(g, characterLevel))
    )).flat().filter((g) => !!g);

    return grants.concat(subGrants);
  }

  async #applyGrants(
    allGrants: Grant[],
    optionalGrants: Grant[],
    options: DefaultApplyOptions
  ): Promise<boolean> {
    if (!allGrants.length && !options.cls) return false;

    const requiresDialog = [...allGrants].some((grant) => grant.requiresConfig())
      || !!optionalGrants.length || options.cls;

    let dialogData: {
      updateData: any,
      success: boolean,
      documentData: Map<string, any[]>,
      clsReturnData: Record<string, any>
    };

    if (!requiresDialog) {
      const grants = allGrants.map((grant) => ({ id: grant._id, grant }));
      const { updateData, documentData } = prepareGrantsApplyData(this.actor, grants, new Map());
      dialogData = {
        success: true, updateData, documentData, clsReturnData: {}
      };
    } else {
      const dialog = new GenericDialog(
        `${this.actor.name} - Apply Grants`,
        GrantApplicationDialog,
        {
          actor: this.actor,
          allGrants,
          optionalGrantsProp: optionalGrants,
          ...options
        }
      );

      await dialog.render(true);
      dialogData = await dialog.promise;

      if (!dialogData?.success) {
        if (options?.item && options.useUpdateSource && !options.cls) options.item.delete();
        return false;
      }
    }

    // Create sub items
    if (dialogData.documentData.size) {
      const updateData: Record<string, any> = {};

      for await (const [grantId, docData] of dialogData.documentData) {
        const docs = (await Promise.all(
          docData.map(async (
            { uuid, type, quantity }: { uuid: string, type: string, quantity: number | null }
          ) => {
            const doc = (await fromUuid(uuid))?.toObject();
            if (!doc) return null;

            if (type === 'feature') return doc;
            if (!quantity) return doc;

            doc.system.quantity = quantity;
            return doc;
          })
        )).filter((d) => !!d);

        try {
          if (docData[0]?.type === 'object') {
            const ids = (await this.actor.createEmbeddedDocuments('Item', docs))
              .map((i: any) => i.id);

            updateData[`system.grants.${grantId}.documentIds`] = ids;
          } else if (docData[0]?.type === 'feature') {
            const preCreateIds = docs.map((d: any) => d._id);

            // Check if the feature is already created
            const existing = this.actor.items.filter((i: any) => preCreateIds.includes(i.id));
            const existingIds = existing.map((i: any) => i.id);

            const filtered = docs.filter((d) => !existingIds.includes(d._id));

            const ids = (await this.actor.createEmbeddedDocuments('Item', filtered, { noGrant: true, keepId: true }))
              .map((i: any) => i.id);

            updateData[`system.grants.${grantId}.documentIds`] = [...ids, ...existingIds];
          }
        }

        catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
          return false;
        }
      }

      foundry.utils.mergeObject(dialogData.updateData, updateData);
    }

    // Update actor with grants data
    if (dialogData.updateData) await this.actor.update(dialogData.updateData);

    // Update class data if available
    if (options.cls) {
      const { clsReturnData } = dialogData;
      const { leveledHpType, hpFormula, hpValue } = clsReturnData;

      let hp: number;
      if (leveledHpType === 'roll' && hpFormula) {
        const roll = await new Roll(hpFormula).roll();
        hp = roll.total;

        this.#createRolledHpCard(options.cls, roll);
      } else if (['custom', 'average'].includes(leveledHpType) && hpValue) {
        hp = hpValue;
      } else {
        hp = options.cls.system.classLevels === 1
          ? options.cls.system.hp.levels['1']
          : options.cls.averageHP;
      }

      const spellCastingAbility = clsReturnData.spellcastingAbility
        || options.cls.system.spellcasting.ability.options[0]
        || options.cls.system.spellcasting.ability.base;

      // TODO: Remove updateSource method
      const updateMethod = options.useUpdateSource
        ? options.cls.updateSource.bind(options.cls)
        : options.cls.update.bind(options.cls);

      await updateMethod({
        [`system.hp.levels.${options.clsLevel}`]: hp,
        'system.spellcasting.ability.value': spellCastingAbility
      });
    }

    return true;
  }

  #createRolledHpCard(cls: typeof Item, roll: any) {
    const title = `Hit Dice Roll - ${cls.name}`;
    const chatData = {
      author: game.user?.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      sound: CONFIG.sounds.dice,
      rolls: [roll],
      flags: {
        a5e: {
          actorId: this.actor.uuid,
          img: this.actor.token?.img ?? this.actor.img,
          name: this.actor.name,
          title
        }
      }
    };

    ChatMessage.create(chatData);
  }

  async removeGrantsByItem(itemUuid: string): Promise<void> {
    const updates: Record<string, any> = {};

    for (const [grantId, grant] of this) {
      if (grant.itemUuid !== itemUuid) continue;

      updates[`system.grants.-=${grantId}`] = null;
      foundry.utils.mergeObject(updates, this.#getRemoveUpdates(grant));
    }

    await this.actor.update(updates);
  }

  async removeGrantsByClassLevel(classLevel: number, slug: string): Promise<boolean> {
    const updates: Record<string, any> = {};

    for (const [grantId, grant] of this) {
      const originItem = fromUuidSync(grant.itemUuid);

      if (!originItem) continue;
      if (!['class', 'feature'].includes(originItem.type)) continue;

      // Skip if the grant is not from the origin class
      if (originItem.type === 'class' && originItem.slug !== slug) continue;
      if (originItem.type === 'feature' && originItem.system.classes !== slug) continue;

      if (grant.level > classLevel) {
        updates[`system.grants.-=${grantId}`] = null;
        foundry.utils.mergeObject(updates, this.#getRemoveUpdates(grant));
      }
    }

    try {
      await this.actor.update(updates);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      return false;
    }

    return true;
  }

  async removeGrantsByLevel(level: number): Promise<boolean> {
    const updates: Record<string, any> = {};

    for (const [grantId, grant] of this) {
      if (grant.level > level) {
        updates[`system.grants.-=${grantId}`] = null;
        foundry.utils.mergeObject(updates, this.#getRemoveUpdates(grant));
      }
    }

    try {
      await this.actor.update(updates);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      return false;
    }

    return true;
  }

  async removeGrant(grantId: string): Promise<void> {
    const grant = this.get(grantId);
    if (!grant) return;

    const updates: Record<string, any> = {
      [`system.grants.-=${grantId}`]: null,
      ...this.#getRemoveUpdates(grant)
    };

    await this.actor.update(updates);
  }

  async removeAll(): Promise<void> {
    const updates: Record<string, any> = {};

    for (const [grantId, grant] of this) {
      updates[`system.grants.-=${grantId}`] = null;
      foundry.utils.mergeObject(updates, this.#getRemoveUpdates(grant));
    }

    await this.actor.update(updates);
  }

  #getRemoveUpdates(grant: ActorGrant): Record<string, any> {
    const updates: Record<string, any> = {};

    if (grant instanceof actorGrants.bonus) {
      if (grant.bonusId) updates[`system.bonuses.${grant.type}.-=${grant.bonusId}`] = null;
    }

    if (grant instanceof actorGrants.exertion) {
      if (grant.exertionData.exertionType === 'bonus') {
        updates[`system.bonuses.exertion.-=${grant.exertionData.bonusId}`] = null;
      }
    }

    if (grant instanceof actorGrants.feature || grant instanceof actorGrants.item) {
      let ids: string[];

      if (grant instanceof actorGrants.feature) {
        const { grantedFeatureDocuments } = this;
        const { documentIds } = grant;

        ids = documentIds.reduce((acc: string[], id: string) => {
          if (grantedFeatureDocuments.has(id)) {
            if (grantedFeatureDocuments.get(id)?.length === 1) acc.push(id);
          }

          return acc;
        }, []);
      } else {
        ids = grant.documentIds;
      }

      if (!ids?.length) return updates;

      // Validate ids to ensure they are not already deleted
      const deleteIds = this.actor.items.reduce((acc: string[], i: typeof Item) => {
        if (ids.includes(i.id)) acc.push(i.id);
        return acc;
      }, []);

      this.actor.deleteEmbeddedDocuments('Item', deleteIds);
    }

    if (grant instanceof actorGrants.proficiency) {
      const { keys, proficiencyType } = grant.proficiencyData;

      if (proficiencyType === 'savingThrow') {
        keys.forEach((key: string) => {
          updates[`system.abilities.${key}.save.proficient`] = false;
        });
      } else if (proficiencyType === 'skill') {
        keys.forEach((key: string) => {
          updates[`system.skills.${key}.proficient`] = 0;
        });
      } else {
        const configObject = prepareProficiencyConfigObject();
        const { propertyKey } = configObject[proficiencyType] ?? {};
        if (!propertyKey) return {};

        const removals: Set<string> = new Set(keys);
        const proficiencies = new Set(
          foundry.utils.getProperty(this.actor, propertyKey) as string[] ?? []
        );

        updates[propertyKey] = [...proficiencies.difference(removals)];
      }
    }

    if (grant instanceof actorGrants.skillSpecialty) {
      const { skill } = grant.specialtyData;

      const existing: Set<string> = new Set(
        foundry.utils.getProperty(
          this.actor,
          `system.skills.${skill}.specialties`
        ) as string[] ?? []
      );

      const removals: Set<string> = new Set(grant.specialtyData.specialties);

      updates[`system.skills.${skill}.specialties`] = [...existing.difference(removals)];
    }

    if (grant instanceof actorGrants.trait) {
      const configObject = prepareTraitGrantConfigObject();
      const { propertyKey } = configObject[grant.traitData.traitType] ?? {};
      if (!propertyKey) return {};

      const removals: Set<string> = new Set(grant.traitData.traits);
      const traits = new Set(
        foundry.utils.getProperty(this.actor, propertyKey) as string[] ?? []
      );

      if (grant.traitData.traitType === 'size') updates[propertyKey] = '';
      else updates[propertyKey] = [...traits.difference(removals)];
    }

    return updates;
  }
}
