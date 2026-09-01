import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/**
 * A deliberately small but non-trivial programmatic node: it uppercases one
 * string field on every incoming item, throws a `NodeOperationError` on bad
 * input, and honours `continueOnFail()`.
 *
 * It exists so the toolkit's examples and tests run against a real node rather
 * than a toy stub.
 */
export class Example implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Example',
    name: 'example',
    icon: 'fa:font',
    group: ['transform'],
    version: 1,
    description: 'Uppercase a string field on each item',
    defaults: { name: 'Example' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Field',
        name: 'field',
        type: 'string',
        default: 'name',
        required: true,
        description: 'Name of the string field to uppercase',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (const [itemIndex, item] of items.entries()) {
      try {
        const field = this.getNodeParameter('field', itemIndex) as string;
        const value = item.json[field];

        if (typeof value !== 'string') {
          throw new NodeOperationError(this.getNode(), `Field "${field}" is not a string`, {
            itemIndex,
          });
        }

        returnData.push({
          json: { ...item.json, [field]: value.toUpperCase() },
          pairedItem: { item: itemIndex },
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: item.json,
            error: error as NodeOperationError,
            pairedItem: { item: itemIndex },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
