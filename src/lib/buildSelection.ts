import { Entity, Attribute, Selection } from "@/types/schema";
import { toSnakeCase } from "@/services/xmlSchemaParser";

/**
 * Build a Selection from an Entity/Attribute pair. The single source of truth for
 * this shape - previously duplicated three times in Index.tsx with drifted fields
 * (one copy stray-included a `description` that isn't even part of the Selection
 * type, which still made it into the downloaded config JSON since JSON.stringify
 * doesn't care about TS types).
 */
export function buildSelection(entity: Entity, attribute: Attribute): Selection {
  return {
    id: attribute.id,
    entity: entity.name,
    attribute: attribute.displayName || attribute.name,
    xmlFile: attribute.xmlFile,
    xpath: attribute.xpath,
    msmdadId: attribute.msmdadId,
    metricKey: `${toSnakeCase(entity.name)}_${toSnakeCase(attribute.name)}`,
  };
}
