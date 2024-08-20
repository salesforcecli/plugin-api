/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import * as os from 'node:os';
import { config, expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';

config.truncateThreshold = 0;

const skipIfWindows = os.platform() === 'win32' ? describe.skip : describe;

//         windows NUTs have been failing with
//        URL No Longer Exists</span></td></tr>
// <tr><td>You have attempted to reach a URL that no longer exists on salesforce.com. <br/><br/>
// You may have reached this page after clicking on a direct link into the application. This direct link might be: <br/>
// A bookmark to a particular page, such as a report or view <br/>
//  A link to a particular page in the Custom Links section of your Home Tab, or a Custom Link <br/>
//  A link to a particular page in your email templates <br/><br/>
//
//     seems to be related to clickjack protection - https://help.salesforce.com/s/articleView?id=000387058&type=1
//       I've confirmed the 'api request rest' command passes on windows

skipIfWindows('api:request:rest NUT', () => {
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
      const result = execCmd("api request rest 'limits'").shellOutput.stdout;

      // make sure we got a JSON object back
      expect(Object.keys(JSON.parse(result) as Record<string, unknown>)).to.have.length;
    });

    it('should pass headers', () => {
      const result = execCmd("api request rest 'limits' -H 'Accept: application/xml'").shellOutput.stdout;

      // the headers will change this to xml
      expect(result.startsWith('<?xml version="1.0" encoding="UTF-8"?><LimitsSnapshot>')).to.be.true;
    });
  });

  describe('stream-to-file', () => {
    it('get result in json format', () => {
      const result = execCmd("api request rest 'limits' --stream-to-file out.txt").shellOutput.stdout;

      expect(result.trim()).to.equal('File saved to out.txt');

      const content = readFileSync(join(testSession.project.dir, 'out.txt'), 'utf-8');
      // make sure we got a JSON object back
      expect(Object.keys(JSON.parse(content) as Record<string, unknown>)).to.have.length;
    });

    it('should pass headers', () => {
      const result = execCmd("api request rest 'limits' -H 'Accept: application/xml'  --stream-to-file out.txt")
        .shellOutput.stdout;

      expect(result.trim()).to.equal('File saved to out.txt');

      const content = readFileSync(join(testSession.project.dir, 'out.txt'), 'utf-8');
      expect(content.startsWith('<?xml version="1.0" encoding="UTF-8"?><LimitsSnapshot>')).to.be.true;
    });
  });
});
