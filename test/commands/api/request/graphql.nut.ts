/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'node:path';
import fs from 'node:fs';
import * as util from 'node:util';
import { config, expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';

config.truncateThreshold = 0;

describe('api:request:graphql NUT', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create({
      scratchOrgs: [
        {
          config: 'config/project-scratch-def.json',
          setDefault: true,
        },
      ],
      project: { gitClone: 'https://github.com/trailheadapps/dreamhouse-lwc' },
      devhubAuthStrategy: 'AUTO',
    });
    fs.writeFileSync(
      join(testSession.project.dir, 'standard.txt'),
      `query accounts {
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
`
    );

    fs.writeFileSync(
      join(testSession.project.dir, 'noResults.txt'),
      `query Address {
  uiapi {
    query {
      Address {
        edges {
          node {
            Id
          }
        }
      }
    }
  }
}
`
    );
  });

  after(async () => {
    await testSession?.clean();
  });

  describe('std out', () => {
    it('get result in json format', () => {
      const result = execCmd('api request graphql --body standard.txt').shellOutput.stdout;
      // eslint-disable-next-line no-console
      console.log('res', util.inspect(result));

      // make sure we got a JSON object back
      const parsed = JSON.parse(result) as Record<string, unknown>;
      expect(Object.keys(parsed)).to.have.length;

      // @ts-expect-error graphql response, just access what we need without typing it
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(parsed.data!.uiapi.query.Account.edges.length).to.equal(1);
      expect(parsed.errors).to.deep.equal([]);
    });

    it('get no results correctly', () => {
      const result = execCmd('api request graphql --body noResults.txt').shellOutput.stdout;
      // eslint-disable-next-line no-console
      console.log('res', util.inspect(result));
      // make sure we got a JSON object back
      const parsed = JSON.parse(result) as Record<string, unknown>;
      expect(Object.keys(parsed)).to.have.length;
      // @ts-expect-error graphql response, just access what we need without typing it
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(parsed.data!.uiapi.query.Address.edges.length).to.equal(0);
      expect(parsed.errors).to.deep.equal([]);
    });
  });

  describe('stream-to-file', () => {
    it('get result in json format', () => {
      execCmd('api request graphql --body standard.txt --stream-to-file out.txt').shellOutput.stdout;
      // make sure we got a JSON object back
      const parsed = JSON.parse(fs.readFileSync(join(testSession.project.dir, 'out.txt'), 'utf8')) as Record<
        string,
        unknown
      >;
      expect(Object.keys(parsed)).to.have.length;
      // @ts-expect-error graphql response, just access what we need without typing it
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(parsed.data!.uiapi.query.Account.edges.length).to.equal(1);
      expect(parsed.errors).to.deep.equal([]);
    });

    it('get no results correctly', () => {
      execCmd('api request graphql --body noResults.txt --stream-to-file empty.txt').shellOutput.stdout;

      // make sure we got a JSON object back
      const parsed = JSON.parse(fs.readFileSync(join(testSession.project.dir, 'empty.txt'), 'utf8')) as Record<
        string,
        unknown
      >;
      expect(Object.keys(parsed)).to.have.length;
      // @ts-expect-error graphql response, just access what we need without typing it
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(parsed.data!.uiapi.query.Address.edges.length).to.equal(0);
      expect(parsed.errors).to.deep.equal([]);
    });
  });
});
