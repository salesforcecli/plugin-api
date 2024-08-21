/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ProxyAgent } from 'proxy-agent';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { Messages, Org, SFDX_HTTP_HEADERS } from '@salesforce/core';
import { Args } from '@oclif/core';
import { getHeaders, includeFlag, sendAndPrintRequest, streamToFileFlag } from '../../../shared/shared.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-api', 'rest');

export class Rest extends SfCommand<void> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static state = 'beta';
  public static enableJsonFlag = false;
  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    include: includeFlag,
    method: Flags.option({
      options: ['GET', 'POST', 'PUT', 'PATCH', 'HEAD', 'DELETE', 'OPTIONS', 'TRACE'] as const,
      summary: messages.getMessage('flags.method.summary'),
      char: 'X',
      default: 'GET',
    })(),
    header: Flags.string({
      summary: messages.getMessage('flags.header.summary'),
      helpValue: 'key:value',
      char: 'H',
      multiple: true,
    }),
    'stream-to-file': streamToFileFlag,
    body: Flags.string({
      summary: messages.getMessage('flags.body.summary'),
      allowStdin: true,
      helpValue: 'file',
    }),
  };

  public static args = {
    endpoint: Args.string({
      description: 'Salesforce API endpoint',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { flags, args } = await this.parse(Rest);

    const org = flags['target-org'];
    const streamFile = flags['stream-to-file'];
    const headers = flags.header ? getHeaders(flags.header) : {};

    // replace first '/' to create valid URL
    const endpoint = args.endpoint.startsWith('/') ? args.endpoint.replace('/', '') : args.endpoint;
    const url = new URL(
      `${org.getField<string>(Org.Fields.INSTANCE_URL)}/services/data/v${
        flags['api-version'] ?? (await org.retrieveMaxApiVersion())
      }/${endpoint}`
    );

    const body =
      flags.method === 'GET'
        ? undefined
        : // if they've passed in a file name, check and read it
        existsSync(join(process.cwd(), flags.body ?? ''))
        ? readFileSync(join(process.cwd(), flags.body ?? ''))
        : // otherwise it's a stdin, and we use it directly
          flags.body;

    await org.refreshAuth();

    const options = {
      agent: { https: new ProxyAgent() },
      method: flags.method,
      headers: {
        ...SFDX_HTTP_HEADERS,
        Authorization: `Bearer ${
          // we don't care about apiVersion here, just need to get the access token.
          // eslint-disable-next-line sf-plugin/get-connection-with-version
          org.getConnection().getConnectionOptions().accessToken!
        }`,
        ...headers,
      },
      body,
      throwHttpErrors: false,
      followRedirect: false,
    };

    await sendAndPrintRequest({ streamFile, url, options, include: flags.include, this: this });
  }
}
