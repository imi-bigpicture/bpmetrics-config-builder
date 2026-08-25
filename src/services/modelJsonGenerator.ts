import { Selection, Entity } from "@/types/schema";
import { uuidv5 } from "@/lib/uuidv5";
import {
  ENTITY_UIDS,
  BIOLOGICAL_BEING_RELATIONS,
  SPECIMEN_RELATIONS,
  BLOCK_RELATIONS,
  IMAGE_RELATIONS,
  OBSERVATIONS_SKELETON,
  SUPPORTED_ENTITIES,
} from "@/lib/modelJsonConstants";

// Derive model.json attribute_type from the XPath, which was generated from METAFLEX.
function attributeTypeFromXPath(xpath: string): string {
  if (xpath.includes("CODE_ATTRIBUTE")) return "code";
  if (xpath.includes("MEASUREMENT_ATTRIBUTE")) return "measurement";
  if (xpath.includes("NUMERIC_ATTRIBUTE")) return "numeric";
  return "string"; // STRING_ATTRIBUTE, SET_ATTRIBUTE, direct elements
}

export interface ModelJsonResult {
  json: object;
  skippedEntities: string[]; // entity names whose selections were excluded
}

export async function generateModelJson(
  selections: Selection[],
  entities: Entity[]
): Promise<ModelJsonResult> {
  // Build a lookup: selection id → full Attribute (for xpath)
  const attrBySelId = new Map<string, { xpath: string; displayName: string; tag: string; required: boolean }>();
  for (const entity of entities) {
    for (const attr of entity.attributes) {
      attrBySelId.set(attr.id, {
        xpath: attr.xpath,
        displayName: attr.displayName || attr.name,
        tag: attr.name,
        required: attr.required,
      });
    }
  }

  // Group selections by entity id
  const byEntity = new Map<string, Selection[]>();
  for (const sel of selections) {
    // Find the entity this selection belongs to
    const entity = entities.find((e) => e.attributes.some((a) => a.id === sel.id));
    if (!entity) continue;
    const list = byEntity.get(entity.id) ?? [];
    list.push(sel);
    byEntity.set(entity.id, list);
  }

  // Separate supported vs skipped entities
  const skippedEntities: string[] = [];
  for (const [entityId] of byEntity) {
    if (!SUPPORTED_ENTITIES[entityId]) {
      const entity = entities.find((e) => e.id === entityId);
      skippedEntities.push(entity?.name ?? entityId);
    }
  }

  // Build additional_attributes for each supported entity
  async function buildAttributes(entityId: string, modelKey: string) {
    const sels = byEntity.get(entityId) ?? [];
    const attrs = [];
    for (const sel of sels) {
      const full = attrBySelId.get(sel.id);
      if (!full) continue;
      const uid = await uuidv5(`${modelKey}-${full.tag}`);
      attrs.push({
        uid,
        name: `${modelKey}-${full.tag}`,
        display_name: full.displayName,
        tag: full.tag,
        attribute_type: attributeTypeFromXPath(full.xpath),
        optional: !full.required,
      });
    }
    return attrs;
  }

  const [bbAttrs, specAttrs, blockAttrs, imgAttrs] = await Promise.all([
    buildAttributes("biological_being_entity", "biological_being"),
    buildAttributes("specimen_entity", "specimen"),
    buildAttributes("block_entity", "block"),
    buildAttributes("image_entity", "image"),
  ]);

  const json = {
    biological_being: {
      uid: ENTITY_UIDS.biological_being,
      ...BIOLOGICAL_BEING_RELATIONS,
      additional_attributes: bbAttrs,
    },
    specimen: {
      uid: ENTITY_UIDS.specimen,
      ...SPECIMEN_RELATIONS,
      additional_attributes: specAttrs,
    },
    block: {
      uid: ENTITY_UIDS.block,
      ...BLOCK_RELATIONS,
      additional_attributes: blockAttrs,
    },
    image: {
      uid: ENTITY_UIDS.image,
      ...IMAGE_RELATIONS,
      additional_attributes: imgAttrs,
    },
    observations: OBSERVATIONS_SKELETON,
  };

  return { json, skippedEntities };
}
