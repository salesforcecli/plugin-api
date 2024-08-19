/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import fs, { createWriteStream } from 'node:fs';
import * as os from 'node:os';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, Org, SFDX_HTTP_HEADERS, SfError } from '@salesforce/core';
import { ProxyAgent } from 'proxy-agent';
import ansis from 'ansis';
import got from 'got';
import type { AnyJson } from '@salesforce/ts-types';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-api', 'graphql');

export default class Graphql extends SfCommand<void> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly state = 'beta';

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'stream-to-file': Flags.string({
      summary: messages.getMessage('flags.stream-to-file.summary'),
      helpValue: 'Example: report.xlsx',
      char: 'S',
      exclusive: ['include'],
    }),
    include: Flags.boolean({
      char: 'i',
      summary: messages.getMessage('flags.include.summary'),
      default: false,
      exclusive: ['stream-to-file'],
    }),
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
    const apiVersion = await org.retrieveMaxApiVersion();
    const body = fs.existsSync(flags.body)
      ? `{"query":"${fs.readFileSync(flags.body, 'utf8').replaceAll(os.EOL, '\\n').replaceAll('"', '\\"')}"}`
      : flags.body;

    await org.refreshAuth();

    const url = new URL(`${org.getField<string>(Org.Fields.INSTANCE_URL)}/services/data/v${apiVersion}/graphql`);

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

    if (streamFile) {
      const responseStream = got.stream.post(url, options);
      const fileStream = createWriteStream(streamFile);
      responseStream.pipe(fileStream);

      fileStream.on('finish', () => this.log(`File saved to ${streamFile}`));
      fileStream.on('error', (error) => {
        throw SfError.wrap(error);
      });
      responseStream.on('error', (error) => {
        throw SfError.wrap(error);
      });
    } else {
      const res = await got.post(url, options);

      // Print HTTP response status and headers.
      if (flags.include) {
        this.log(`HTTP/${res.httpVersion} ${res.statusCode}`);
        Object.entries(res.headers).map(([header, value]) => {
          this.log(`${ansis.blue.bold(header)}: ${Array.isArray(value) ? value.join(',') : value ?? '<undefined>'}`);
        });
      }

      try {
        // Try to pretty-print JSON response.
        this.styledJSON(JSON.parse(res.body) as AnyJson);
      } catch (err) {
        // If response body isn't JSON, just print it to stdout.
        this.log(res.body);
      }

      if (res.statusCode >= 400) {
        process.exitCode = 1;
      }
    }
  }
}
