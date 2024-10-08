/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import fs from 'node:fs';
import * as os from 'node:os';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, Org, SFDX_HTTP_HEADERS } from '@salesforce/core';
import { ProxyAgent } from 'proxy-agent';
import { includeFlag, sendAndPrintRequest, streamToFileFlag } from '../../../shared/shared.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-api', 'graphql');

export default class Graphql extends SfCommand<void> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly state = 'beta';

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    'stream-to-file': streamToFileFlag,
    include: includeFlag,
    body: Flags.string({
      summary: messages.getMessage('flags.body.summary'),
      allowStdin: true,
      helpValue: 'file',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Graphql);

    const org = flags['target-org'];
    const streamFile = flags['stream-to-file'];
    const apiVersion = flags['api-version'] ?? (await org.retrieveMaxApiVersion());
    const body = `{"query":"${(fs.existsSync(flags.body) ? fs.readFileSync(flags.body, 'utf8') : flags.body)
      .replaceAll(os.EOL, '\\n')
      .replaceAll('"', '\\"')}"}`;
    const url = new URL(`${org.getField<string>(Org.Fields.INSTANCE_URL)}/services/data/v${apiVersion}/graphql`);

    await org.refreshAuth();

    const options = {
      agent: { https: new ProxyAgent() },
      headers: {
        ...SFDX_HTTP_HEADERS,
        Authorization: `Bearer ${org.getConnection(apiVersion).getConnectionOptions().accessToken!}`,
      },
      body,
      throwHttpErrors: false,
      followRedirect: false,
    };

    await sendAndPrintRequest({ streamFile, url, options, include: flags.include, this: this });
  }
}
