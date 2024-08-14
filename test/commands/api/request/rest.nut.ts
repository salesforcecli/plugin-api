/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { config, expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';

config.truncateThreshold = 0;

describe('api:request:rest NUT', () => {
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
  });

  after(async () => {
    await testSession?.clean();
  });

  describe('std out', () => {
    it('get result in json format', () => {
      const result = execCmd("api request rest 'services/data/v56.0/limits'").shellOutput.stdout;
      // make sure we got a JSON object back
      expect(Object.keys(JSON.parse(result) as Record<string, unknown>)).to.have.length;
    });

    it('should pass headers', () => {
      const result = execCmd("api request rest 'services/data/v56.0/limits' -H 'Accept: application/xml'").shellOutput
        .stdout;
      // the headers will change this to xml
      expect(result.startsWith('<?xml version="1.0" encoding="UTF-8"?><LimitsSnapshot>')).to.be.true;
    });
  });

  describe('stream-to-file', () => {
    it('get result in json format', () => {
      const result = execCmd("api request rest 'services/data/v56.0/limits' --stream-to-file out.txt").shellOutput
        .stdout;
      expect(result.trim()).to.equal('File saved to out.txt');

      const content = readFileSync(join(testSession.project.dir, 'out.txt'), 'utf-8');
      // make sure we got a JSON object back
      expect(Object.keys(JSON.parse(content) as Record<string, unknown>)).to.have.length;
    });

    it('should pass headers', () => {
      const result = execCmd(
        "api request rest 'services/data/v56.0/limits' -H 'Accept: application/xml'  --stream-to-file out.txt"
      ).shellOutput.stdout;
      expect(result.trim()).to.equal('File saved to out.txt');

      const content = readFileSync(join(testSession.project.dir, 'out.txt'), 'utf-8');
      expect(content.startsWith('<?xml version="1.0" encoding="UTF-8"?><LimitsSnapshot>')).to.be.true;
    });
  });
});
