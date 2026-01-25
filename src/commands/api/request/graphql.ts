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

    // refresh access token to ensure `got` gets a valid access token.
    // TODO: we could skip this step if we used jsforce's HTTP module instead (handles expired tokens).
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
