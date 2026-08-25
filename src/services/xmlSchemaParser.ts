import { XMLParser } from 'fast-xml-parser';
import { Entity, Attribute } from '../types/schema';
import { fetchAllSchemas, getAllCachedSchemas, hasCachedSchemas } from './schemaFetcher';
import { parseXsdRequirements, isRequiredForSubmission, EntityXsdRequirements } from './xsdRequirements';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  trimValues: true,
});

// CMMS Entity to XSD file mapping based on MetaFleX structure
const cmmsEntityToXsdFile: Record<string, string> = {
  'Dataset': 'BP.dataset.xsd',
  'Policy': 'BP.policy.xsd',
  'Biological Being': 'BP.sample.xsd',
  'Case': 'BP.sample.xsd',
  'Specimen': 'BP.sample.xsd',
  'Block': 'BP.sample.xsd',
  'Slide': 'BP.sample.xsd',
  'Staining': 'BP.staining.xsd',
  'Image': 'BP.image.xsd',
  'Annotation': 'BP.annotation.xsd',
  'Observation': 'BP.observation.xsd',
  'Observer': 'BP.observer.xsd',
  'Landing Page': 'BP.landing_page.xsd',
  'Landing page': 'BP.landing_page.xsd', // MSMdad data uses this casing inconsistently
  'REMS': 'BP.rems.xsd',
  'Organisation': 'BP.organisation.xsd',
  'DataCite': 'BP.dataset.xsd', // DataCite is part of dataset
};

// CMMS Entity to XML element name mapping
const cmmsEntityToElement: Record<string, string> = {
  'Dataset': 'DATASET',
  'Policy': 'POLICY',
  'Biological Being': 'BIOLOGICAL_BEING',
  'Case': 'CASE',
  'Specimen': 'SPECIMEN',
  'Block': 'BLOCK',
  'Slide': 'SLIDE',
  'Staining': 'STAINING',
  'Image': 'IMAGE',
  'Annotation': 'ANNOTATION',
  'Observation': 'OBSERVATION',
  'Observer': 'OBSERVER',
  'Landing Page': 'LANDING_PAGE',
  'Landing page': 'LANDING_PAGE', // MSMdad data uses this casing inconsistently
  'REMS': 'REMS',
  'Organisation': 'ORGANISATION',
  'DataCite': 'DATACITE',
};

// XSD file to XML file mapping
const xsdToXmlFile: Record<string, string> = {
  'BP.annotation.xsd': 'annotation.xml',
  'BP.common.xsd': 'common.xml',
  'BP.dataset.xsd': 'dataset.xml',
  'BP.image.xsd': 'image.xml',
  'BP.landing_page.xsd': 'landing_page.xml',
  'BP.observation.xsd': 'observation.xml',
  'BP.observer.xsd': 'observer.xml',
  'BP.organisation.xsd': 'organisation.xml',
  'BP.policy.xsd': 'policy.xml',
  'BP.rems.xsd': 'rems.xml',
  'BP.sample.xsd': 'sample.xml',
  'BP.staining.xsd': 'staining.xml',
};

function toSnakeCase(str: string): string {
  return str
    .replace(/\s+/g, '_')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * Generate XPath from METAFLEX field value
 * @param metaflex The METAFLEX field value from MSMdad
 * @param entityElement The XML element name for the entity (e.g., 'POLICY', 'DATASET')
 * @param machineReadableName The machine-readable field name (e.g., 'type_of_dataset', 'DATASET_REF')
 * @returns The XPath expression
 */
export function generateXPathFromMetaflex(
  metaflex: string,
  entityElement: string,
  machineReadableName: string
): string {
  if (!metaflex || metaflex === '-') {
    return `/${entityElement}/${machineReadableName.toUpperCase()}`;
  }

  const metaflexLower = metaflex.toLowerCase();
  const machineName = machineReadableName.toUpperCase();

  // ObjectType Attribute "alias" AND/OR "accession" - Entity ID attributes
  if (metaflexLower.includes('objecttype') && metaflexLower.includes('attribute')) {
    return `/${entityElement}/@alias | /${entityElement}/@accession`;
  }

  // RefObjectType or ReferenceType - Reference to another entity
  if (metaflexLower.includes('refobjecttype') || metaflexLower.includes('referencetype')) {
    return `/${entityElement}/${machineName}/@accession`;
  }

  // StringAttributeType - Generic string attribute in ATTRIBUTES container
  if (metaflexLower.includes('stringattributetype')) {
    const tag = machineReadableName.toLowerCase();
    return `/${entityElement}/ATTRIBUTES/STRING_ATTRIBUTE[TAG='${tag}']/VALUE`;
  }

  // NumericAttributeType - Generic numeric attribute in ATTRIBUTES container
  if (metaflexLower.includes('numericattributetype')) {
    const tag = machineReadableName.toLowerCase();
    return `/${entityElement}/ATTRIBUTES/NUMERIC_ATTRIBUTE[TAG='${tag}']/VALUE`;
  }

  // MeasurementAttributeType - Generic measurement attribute in ATTRIBUTES container
  if (metaflexLower.includes('measurementattributetype')) {
    const tag = machineReadableName.toLowerCase();
    return `/${entityElement}/ATTRIBUTES/MEASUREMENT_ATTRIBUTE[TAG='${tag}']/VALUE`;
  }

  // CodeAttributeType - Generic code attribute in ATTRIBUTES container
  if (metaflexLower.includes('codeattributetype')) {
    const tag = machineReadableName.toLowerCase();
    return `/${entityElement}/ATTRIBUTES/CODE_ATTRIBUTE[TAG='${tag}']/VALUE`;
  }

  // StatementType - Statement element
  if (metaflexLower.includes('statementtype')) {
    return `/${entityElement}/STATEMENT`;
  }

  // IdentifierType - Identifier elements
  if (metaflexLower.includes('identifiertype')) {
    return `/${entityElement}/IDENTIFIERS/IDENTIFIER`;
  }

  // LinkType - Link elements
  if (metaflexLower.includes('linktype')) {
    return `/${entityElement}/LINKS/LINK`;
  }

  // xs:string, xs:boolean, xs:integer, etc. - Direct element
  if (metaflexLower.startsWith('xs:')) {
    return `/${entityElement}/${machineName}`;
  }

  // Choice types (e.g., for IMAGE_OF which can reference multiple entity types)
  if (metaflexLower.includes('choice')) {
    return `/${entityElement}/${machineName}/@accession`;
  }

  // Default: assume it's a direct element
  return `/${entityElement}/${machineName}`;
}

/**
 * Extract NA status from the NA field
 */
function getNaStatus(naValue: string): string | undefined {
  if (!naValue || naValue === '-') return undefined;
  return naValue.trim();
}

/**
 * Check if attribute is required based on NA field (for ATTRIBUTES block items)
 */
function isRequiredByNaField(naValue: string): boolean {
  return naValue?.toLowerCase().includes('not allowed') || false;
}

// MSMdad's Data_Type field is free text written by spec authors, not a controlled
// vocabulary - these are the actual inconsistent spellings found in the schema data,
// folded together. Anything not listed here is passed through as-is (trimmed) rather
// than guessed at.
const DATA_TYPE_SYNONYMS: Record<string, string> = {
  'STRING': 'STRING',
  'STRING ATTRIBUTE': 'STRING',
  'STRING_ATTRIBUTE': 'STRING',
  'SET_ATTRIBUTE': 'SET',
  'SET ATTRIBUTE': 'SET',
  'ATTRIBUTE SET': 'SET',
  'SET': 'SET',
  'CODE ATTRIBUTE': 'CODE ATTRIBUTE',
  'CODE ATTRIBUTE OR STRING': 'CODE ATTRIBUTE OR STRING',
  'FLOAT': 'FLOAT',
  'INT': 'INT',
  'U-INT': 'U-INT',
};

// Values that are placeholders in the spec rather than real type names
// (e.g. "TDB" is almost certainly a typo for "TBD").
const DATA_TYPE_PLACEHOLDER_VALUES = new Set(['TDB', 'STATEMENT']);

/**
 * Normalize MSMdad's free-text Data_Type field. Missing or placeholder values become
 * "Unknown" (visibly distinct from a genuinely-asserted type) rather than silently
 * defaulting to STRING.
 */
export function normalizeDataType(raw: string | undefined): string {
  const trimmed = raw?.trim();
  if (!trimmed) return 'Unknown';

  const key = trimmed.toUpperCase();
  if (DATA_TYPE_PLACEHOLDER_VALUES.has(key)) return 'Unknown';

  return DATA_TYPE_SYNONYMS[key] || trimmed;
}

function parseEntityXml(
  filename: string, 
  xmlText: string,
  xsdRequirements: Map<string, EntityXsdRequirements>
): Entity | null {
  try {
    const parsed = parser.parse(xmlText);
    
    if (!parsed.Entity) {
      console.error(`No Entity found in ${filename}`);
      return null;
    }

    const entityData = parsed.Entity;
    // Use <Name> tag for entity name
    const entityName = entityData.Name || entityData['@_name'] || '';
    const entityId = toSnakeCase(entityName);
    const attributes: Attribute[] = [];

    // Parse attributes - handle both array and single attribute cases
    const attributesList = entityData.Attributes?.ATTRIBUTE;
    if (attributesList) {
      const attrArray = Array.isArray(attributesList) ? attributesList : [attributesList];
      
      for (const attr of attrArray) {
        // Machine_Readable_Field_Name for the name field
        const machineReadableName = attr.Machine_Readable_Field_Name || '';
        // Name tag for display
        const displayName = attr.Name || '';
        // CMMS_Entity to determine the XSD file
        const cmmsEntity = attr.CMMS_Entity || '';
        // METAFLEX field for XPath generation
        const metaflex = attr.METAFLEX || '';
        
        if (!machineReadableName && !displayName) continue;

        const attributeId = toSnakeCase(machineReadableName || displayName);

        // Determine XSD file from CMMS_Entity
        if (cmmsEntity && !(cmmsEntity in cmmsEntityToXsdFile)) {
          console.warn(
            `Unrecognized CMMS_Entity "${cmmsEntity}" for attribute "${machineReadableName || displayName}" ` +
            `in ${filename} - falling back to BP.common.xsd / unknown.xml and an uppercased entity id. ` +
            `Its XML File and XPath are likely wrong.`
          );
        }
        const xsdFile = cmmsEntityToXsdFile[cmmsEntity] || 'BP.common.xsd';
        const xmlFile = xsdToXmlFile[xsdFile] || 'unknown.xml';

        // Get XML element name from CMMS_Entity
        const entityElement = cmmsEntityToElement[cmmsEntity] || entityId.toUpperCase();
        
        // Generate XPath from METAFLEX
        const xpath = generateXPathFromMetaflex(metaflex, entityElement, machineReadableName || displayName);

        // Get NA status from MSMDAD
        const naStatus = getNaStatus(attr.Value_Specification?.NA);
        
        // Determine if required for submission
        // For AttributeType items (in ATTRIBUTES block), use NA field
        // For direct elements/attributes, use XSD minOccurs/use
        const metaflexLower = metaflex?.toLowerCase() || '';
        const isAttributeBlockItem = 
          metaflexLower.includes('stringattributetype') ||
          metaflexLower.includes('numericattributetype') ||
          metaflexLower.includes('measurementattributetype') ||
          metaflexLower.includes('codeattributetype') ||
          metaflexLower.includes('setattributetype');
        
        const required = isAttributeBlockItem
          ? isRequiredByNaField(attr.Value_Specification?.NA)
          : isRequiredForSubmission(metaflex, machineReadableName || displayName, xsdRequirements);

        const attribute: Attribute = {
          id: attributeId,
          name: machineReadableName || displayName, // Machine-readable
          displayName: displayName || machineReadableName, // Human-readable
          type: normalizeDataType(attr.Value_Specification?.Data_Type),
          required,
          naStatus,
          xpath: xpath,
          xmlFile: xmlFile,
          msmdadId: attr.Attribute_ID || '',
          description: (attr.Description || '').replace(/\s+/g, ' ').trim(),
          entityId: entityId,
        };

        attributes.push(attribute);
      }
    }

    return {
      id: entityId,
      name: entityName,
      description: entityData.Description && entityData.Description !== `Entity for ${entityName}` 
        ? entityData.Description 
        : undefined,
      attributes: attributes,
    };
  } catch (error) {
    console.error(`Error parsing ${filename}:`, error);
    return null;
  }
}

export type SchemaLoadStatus = 'live' | 'degraded' | 'failed';

export interface ParseAllEntitiesResult {
  entities: Entity[];
  status: SchemaLoadStatus;
  fallbackFiles: string[];
  failedFiles: string[];
}

/**
 * Parse all entities from schemas
 * Will fetch from GitHub if not cached, otherwise uses local cache
 */
export async function parseAllEntities(forceRefresh: boolean = false): Promise<ParseAllEntitiesResult> {
  const entities: Entity[] = [];

  // Get schemas from cache or fetch from GitHub
  let schemas: Map<string, string>;
  let fallbackFiles: string[] = [];
  let failedFiles: string[] = [];

  if (forceRefresh || !hasCachedSchemas()) {
    const result = await fetchAllSchemas(forceRefresh);
    schemas = result.schemas;
    fallbackFiles = [...result.fallbackFiles];
    failedFiles = [...result.failedFiles];
  } else {
    schemas = getAllCachedSchemas();
  }

  // Parse XSD requirements
  const xsdResult = await parseXsdRequirements(forceRefresh);
  const xsdRequirements = xsdResult.requirements;
  fallbackFiles.push(...xsdResult.fallbackFiles);
  failedFiles.push(...xsdResult.failedFiles);

  // Parse each schema
  for (const [filename, content] of schemas) {
    const entity = parseEntityXml(filename, content, xsdRequirements);
    if (entity && entity.attributes.length > 0) {
      // Ensure all attributes have the correct entityId
      entity.attributes.forEach(attr => {
        if (attr.entityId !== entity.id) {
          console.warn(`Attribute ${attr.id} has wrong entityId: ${attr.entityId} should be ${entity.id}`);
          attr.entityId = entity.id;
        }
      });
      entities.push(entity);
    }
  }

  const status: SchemaLoadStatus =
    schemas.size === 0
      ? 'failed'
      : fallbackFiles.length > 0 || failedFiles.length > 0
        ? 'degraded'
        : 'live';

  return { entities, status, fallbackFiles, failedFiles };
}

export { toSnakeCase };
