/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import fs from 'node:fs';
import * as process from 'node:process';
import path from 'node:path';
import { expect } from 'chai';
import stripAnsi from 'strip-ansi';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { sleep } from '@salesforce/kit';
import nock = require('nock');
import Graphql from '../../../../../src/commands/api/request/graphql.js';

describe('graphql', () => {
  const $$ = new TestContext();
  const testOrg = new MockTestOrgData('1234', {
    username: 'test@hub.com',
  });

  let stdoutSpy: sinon.SinonSpy;

  const fileContent = `query accounts {
  uiapi {
    query {
      Account {
        edges {
          node {
            Id
            Name {
              value
            }
          }
        }
      }
    }
  }
}
`;
  const serverResponse = {
    data: {
      uiapi: {
        query: {
          Account: {
            edges: [
              {
                node: {
                  Id: '0017g00001nEdPjAAK',
                  Name: {
                    value: 'Sample Account for Entitlements',
                  },
                },
              },
            ],
          },
        },
      },
    },
    errors: [],
  };

  beforeEach(async () => {
    await $$.stubAuths(testOrg);

    $$.SANDBOX.stub(fs, 'readFileSync').returns(fileContent);
    stdoutSpy = $$.SANDBOX.stub(process.stdout, 'write');
  });

  afterEach(() => {
    $$.SANDBOX.restore();
  });

  it('should run and return graphql query', async () => {
    nock(testOrg.instanceUrl).post('/services/data/v42.0/graphql').reply(200, serverResponse);

    await Graphql.run(['--target-org', 'test@hub.com', '--body', 'standard.txt']);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const output = stripAnsi(stdoutSpy!.args.at(0)!.at(0));

    expect(JSON.parse(output)).to.deep.equal(serverResponse);
  });

  it('should redirect to file', async () => {
    nock(testOrg.instanceUrl).post('/services/data/v42.0/graphql').reply(200, serverResponse);

    await Graphql.run(['--target-org', 'test@hub.com', '--body', 'standard.txt', '--stream-to-file', 'myOutput1.txt']);

    // gives it a second to resolve promises and close streams before we start asserting
    await sleep(1000);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const output = stripAnsi(stdoutSpy!.args.at(0)!.at(0));

    expect(output).to.deep.equal('File saved to myOutput1.txt' + '\n');
    expect(await fs.promises.readFile('myOutput1.txt', 'utf8')).to.deep.equal(
      '{"data":{"uiapi":{"query":{"Account":{"edges":[{"node":{"Id":"0017g00001nEdPjAAK","Name":{"value":"Sample Account for Entitlements"}}}]}}}},"errors":[]}'
    );
  });

  after(() => {
    // more than a UT
    fs.rmSync(path.join(process.cwd(), 'myOutput1.txt'));
  });
});
