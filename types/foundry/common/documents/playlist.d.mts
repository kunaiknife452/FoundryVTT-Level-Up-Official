/**
 * @typedef {import("./_types.d.mts").PlaylistData} PlaylistData
 * @typedef {import("../types.d.mts").DocumentConstructionContext} DocumentConstructionContext
 */
/**
 * The Playlist Document.
 * Defines the DataSchema and common behaviors for a Playlist which are shared between both client and server.
 * @mixes PlaylistData
 */
import Document from '../abstract/document.d.mts';
import * as fields from '../data/fields.d.mts';

export default class BasePlaylist extends Document {
  /** @inheritdoc */
  static defineSchema(): {
    _id: fields.DocumentIdField;
    name: fields.StringField;
    description: fields.StringField;
    sounds: fields.EmbeddedCollectionField;
    channel: fields.StringField;
    mode: fields.NumberField;
    playing: fields.BooleanField;
    fade: fields.NumberField;
    folder: fields.ForeignDocumentField;
    sorting: fields.StringField;
    seed: fields.NumberField;
    sort: fields.IntegerSortField;
    ownership: fields.DocumentOwnershipField;
    flags: fields.ObjectField;
    _stats: fields.DocumentStatsField;
  };
  /** @inheritDoc */
  static migrateData(source: any): any;
  /**
   * Construct a Playlist document using provided data and context.
   * @param {Partial<PlaylistData>} data            Initial data from which to construct the Playlist
   * @param {DocumentConstructionContext} context   Construction context options
   */
  constructor(data: Partial<PlaylistData>, context: DocumentConstructionContext);
}
export type PlaylistData = import('./_types.d.mts').PlaylistData;
export type DocumentConstructionContext = import('../types.d.mts').DocumentConstructionContext;
