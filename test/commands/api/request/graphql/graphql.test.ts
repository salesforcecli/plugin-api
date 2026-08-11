/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-require-imports */
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

     
    const output = stripAnsi(stdoutSpy!.args.at(0)!.at(0));

    expect(JSON.parse(output)).to.deep.equal(serverResponse);
  });

  it('should redirect to file', async () => {
    nock(testOrg.instanceUrl).post('/services/data/v42.0/graphql').reply(200, serverResponse);

    await Graphql.run(['--target-org', 'test@hub.com', '--body', 'standard.txt', '--stream-to-file', 'myOutput1.txt']);

    // gives it a second to resolve promises and close streams before we start asserting
    await sleep(1000);
     
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
