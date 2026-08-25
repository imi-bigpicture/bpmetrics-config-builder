import { XMLParser } from 'fast-xml-parser';
import { fetchAllXsdSchemas, getAllCachedXsdSchemas, hasCachedXsdSchemas } from './xsdFetcher';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  trimValues: true,
});

export interface XsdRequirement {
  name: string;
  minOccurs: number;
  maxOccurs: number | 'unbounded';
  use?: 'required' | 'optional'; // For xs:attribute
  type?: string;
}

export interface EntityXsdRequirements {
  elements: Map<string, XsdRequirement>;
  attributes: Map<string, XsdRequirement>;
}

// fast-xml-parser output for an XSD node: inherently dynamic, deeply-nested JSON
// with no fixed shape worth modeling here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XmlNode = any;

export interface ParseXsdRequirementsResult {
  requirements: Map<string, EntityXsdRequirements>;
  fallbackFiles: string[];
  failedFiles: string[];
}

// Cache for parsed XSD requirements
let xsdRequirementsCache: ParseXsdRequirementsResult | null = null;

/**
 * Parse all XSD files and extract element/attribute requirements
 */
export async function parseXsdRequirements(forceRefresh: boolean = false): Promise<ParseXsdRequirementsResult> {
  if (xsdRequirementsCache && !forceRefresh) {
    return xsdRequirementsCache;
  }

  const requirements = new Map<string, EntityXsdRequirements>();

  let xsdSchemas: Map<string, string>;
  let fallbackFiles: string[] = [];
  let failedFiles: string[] = [];
  if (forceRefresh || !hasCachedXsdSchemas()) {
    const result = await fetchAllXsdSchemas(forceRefresh);
    xsdSchemas = result.schemas;
    fallbackFiles = result.fallbackFiles;
    failedFiles = result.failedFiles;
  } else {
    xsdSchemas = getAllCachedXsdSchemas();
  }

  for (const [filename, content] of xsdSchemas) {
    try {
      parseXsdFile(filename, content, requirements);
    } catch (error) {
      console.error(`Error parsing XSD requirements from ${filename}:`, error);
    }
  }

  // Add ObjectType and ReferenceType requirements from BP.common.xsd
  addCommonTypeRequirements(requirements);

  const result: ParseXsdRequirementsResult = { requirements, fallbackFiles, failedFiles };
  xsdRequirementsCache = result;
  return result;
}

/**
 * Add ObjectType and ReferenceType requirements (from BP.common.xsd)
 */
function addCommonTypeRequirements(requirements: Map<string, EntityXsdRequirements>): void {
  // ObjectType attributes (alias is required, accession is optional)
  const objectTypeReqs: EntityXsdRequirements = {
    elements: new Map(),
    attributes: new Map([
      ['alias', { name: 'alias', minOccurs: 1, maxOccurs: 1, use: 'required' }],
      ['accession', { name: 'accession', minOccurs: 0, maxOccurs: 1, use: 'optional' }],
    ]),
  };
  requirements.set('ObjectType', objectTypeReqs);

  // ReferenceType attributes (alias is required, accession is optional)
  const refTypeReqs: EntityXsdRequirements = {
    elements: new Map(),
    attributes: new Map([
      ['alias', { name: 'alias', minOccurs: 1, maxOccurs: 1, use: 'required' }],
      ['accession', { name: 'accession', minOccurs: 0, maxOccurs: 1, use: 'optional' }],
    ]),
  };
  requirements.set('ReferenceType', refTypeReqs);
}

/**
 * Parse a single XSD file and extract requirements
 */
function parseXsdFile(
  filename: string,
  content: string,
  requirements: Map<string, EntityXsdRequirements>
): void {
  const parsed = parser.parse(content);
  const schema = parsed['xs:schema'];
  if (!schema) return;

  // Process complex types
  const complexTypes = schema['xs:complexType'];
  if (complexTypes) {
    const types = Array.isArray(complexTypes) ? complexTypes : [complexTypes];
    for (const type of types) {
      const typeName = type['@_name'];
      if (!typeName) continue;
      
      const entityReqs: EntityXsdRequirements = {
        elements: new Map(),
        attributes: new Map(),
      };
      
      parseComplexType(type, entityReqs);
      requirements.set(typeName, entityReqs);
    }
  }

  // Process root elements
  const elements = schema['xs:element'];
  if (elements) {
    const elemArray = Array.isArray(elements) ? elements : [elements];
    for (const elem of elemArray) {
      const elemName = elem['@_name'];
      if (!elemName) continue;
      
      // If element has inline complexType, parse it
      if (elem['xs:complexType']) {
        const entityReqs: EntityXsdRequirements = {
          elements: new Map(),
          attributes: new Map(),
        };
        parseComplexType(elem['xs:complexType'], entityReqs);
        requirements.set(elemName, entityReqs);
      }
    }
  }
}

/**
 * Parse a complex type and extract element/attribute requirements
 */
function parseComplexType(type: XmlNode, reqs: EntityXsdRequirements): void {
  // Handle xs:complexContent with extension
  if (type['xs:complexContent']?.['xs:extension']) {
    const extension = type['xs:complexContent']['xs:extension'];
    if (extension['xs:sequence']) {
      parseSequence(extension['xs:sequence'], reqs);
    }
    if (extension['xs:choice']) {
      parseChoice(extension['xs:choice'], reqs);
    }
    parseAttributes(extension, reqs);
  }

  // Handle direct sequence
  if (type['xs:sequence']) {
    parseSequence(type['xs:sequence'], reqs);
  }

  // Handle direct choice
  if (type['xs:choice']) {
    parseChoice(type['xs:choice'], reqs);
  }

  // Handle direct attributes
  parseAttributes(type, reqs);
}

/**
 * Parse xs:sequence and extract element requirements
 */
function parseSequence(sequence: XmlNode, reqs: EntityXsdRequirements): void {
  if (!sequence) return;

  const elements = sequence['xs:element'];
  if (elements) {
    const elemArray = Array.isArray(elements) ? elements : [elements];
    for (const elem of elemArray) {
      const name = elem['@_name'];
      if (!name) continue;

      const minOccurs = parseInt(elem['@_minOccurs'] ?? '1', 10);
      const maxOccursStr = elem['@_maxOccurs'] ?? '1';
      const maxOccurs = maxOccursStr === 'unbounded' ? 'unbounded' : parseInt(maxOccursStr, 10);
      const type = elem['@_type'] || '';

      reqs.elements.set(name, {
        name,
        minOccurs,
        maxOccurs,
        type,
      });

      // Recursively parse nested complex types
      if (elem['xs:complexType']) {
        parseComplexType(elem['xs:complexType'], reqs);
      }
    }
  }

  // Handle nested choice within sequence
  if (sequence['xs:choice']) {
    parseChoice(sequence['xs:choice'], reqs);
  }
}

/**
 * Parse xs:choice and extract element requirements
 */
function parseChoice(choice: XmlNode, reqs: EntityXsdRequirements): void {
  if (!choice) return;

  const elements = choice['xs:element'];
  if (elements) {
    const elemArray = Array.isArray(elements) ? elements : [elements];
    for (const elem of elemArray) {
      const name = elem['@_name'];
      if (!name) continue;

      // In a choice, minOccurs is from the element itself or defaults based on choice context
      const minOccurs = parseInt(elem['@_minOccurs'] ?? '0', 10);
      const maxOccursStr = elem['@_maxOccurs'] ?? 'unbounded';
      const maxOccurs = maxOccursStr === 'unbounded' ? 'unbounded' : parseInt(maxOccursStr, 10);
      const type = elem['@_type'] || '';

      reqs.elements.set(name, {
        name,
        minOccurs,
        maxOccurs,
        type,
      });
    }
  }
}

/**
 * Parse xs:attribute elements
 */
function parseAttributes(parent: XmlNode, reqs: EntityXsdRequirements): void {
  const attrs = parent['xs:attribute'];
  if (!attrs) return;

  const attrArray = Array.isArray(attrs) ? attrs : [attrs];
  for (const attr of attrArray) {
    const name = attr['@_name'];
    if (!name) continue;

    const use = attr['@_use'] as 'required' | 'optional' | undefined;
    const isRequired = use === 'required';

    reqs.attributes.set(name, {
      name,
      minOccurs: isRequired ? 1 : 0,
      maxOccurs: 1,
      use: use || 'optional',
      type: attr['@_type'] || '',
    });
  }
}

/**
 * Determine if an attribute is required for submission based on METAFLEX type and XSD
 */
export function isRequiredForSubmission(
  metaflex: string,
  machineReadableName: string,
  entityRequirements: Map<string, EntityXsdRequirements>
): boolean {
  if (!metaflex || metaflex === '-') {
    return false;
  }

  const metaflexLower = metaflex.toLowerCase();

  // ObjectType Attribute (alias/accession) - alias is required
  if (metaflexLower.includes('objecttype') && metaflexLower.includes('attribute')) {
    const objectType = entityRequirements.get('ObjectType');
    if (objectType) {
      // alias is required, accession is optional
      // Since this represents the entity ID, it's always required (alias)
      return true;
    }
  }

  // RefObjectType or ReferenceType - check if the reference element is required
  if (metaflexLower.includes('refobjecttype') || metaflexLower.includes('referencetype')) {
    // The reference element itself (e.g., DATASET_REF) needs to be checked
    // We need to look up the specific entity's requirements
    // For now, check common patterns
    for (const [, entityReqs] of entityRequirements) {
      const elemName = machineReadableName.toUpperCase();
      const elemReq = entityReqs.elements.get(elemName);
      if (elemReq && elemReq.minOccurs >= 1) {
        return true;
      }
    }
    return false;
  }

  // AttributeType (StringAttributeType, NumericAttributeType, etc.)
  // These are dynamic and their requirement depends on the NA field in MSMDAD
  // Return false here - the caller should use naStatus for these
  if (
    metaflexLower.includes('stringattributetype') ||
    metaflexLower.includes('numericattributetype') ||
    metaflexLower.includes('measurementattributetype') ||
    metaflexLower.includes('codeattributetype') ||
    metaflexLower.includes('setattributetype')
  ) {
    return false;
  }

  // Direct xs: types (xs:string, xs:boolean, etc.) - check element requirements
  if (metaflexLower.startsWith('xs:')) {
    for (const [, entityReqs] of entityRequirements) {
      const elemName = machineReadableName.toUpperCase();
      const elemReq = entityReqs.elements.get(elemName);
      if (elemReq && elemReq.minOccurs >= 1) {
        return true;
      }
    }
    return false;
  }

  // Default: not required
  return false;
}

/**
 * Get requirement for a specific element in an entity type
 */
export function getElementRequirement(
  entityTypeName: string,
  elementName: string,
  requirements: Map<string, EntityXsdRequirements>
): XsdRequirement | null {
  const entityReqs = requirements.get(entityTypeName);
  if (!entityReqs) return null;
  
  return entityReqs.elements.get(elementName) || null;
}

/**
 * Clear the cache
 */
export function clearXsdRequirementsCache(): void {
  xsdRequirementsCache = null;
}
