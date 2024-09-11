/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ProxyAgent } from 'proxy-agent';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { Messages, Org, SFDX_HTTP_HEADERS, SfError } from '@salesforce/core';
import { Args } from '@oclif/core';
import { getHeaders, includeFlag, sendAndPrintRequest, streamToFileFlag } from '../../../shared/shared.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-api', 'rest');
const MethodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'HEAD', 'DELETE', 'OPTIONS', 'TRACE'] as const;

type PostmanSchema = {
  url: { raw: string } | string;
  method: typeof MethodOptions;
  description?: string;
  header: string | Array<Record<string, string>>;
  body: { mode: 'raw' | 'formdata'; raw: string; formdata: FormData };
};

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
      options: MethodOptions,
      summary: messages.getMessage('flags.method.summary'),
      char: 'X',
    })(),
    header: Flags.string({
      summary: messages.getMessage('flags.header.summary'),
      helpValue: 'key:value',
      char: 'H',
      multiple: true,
    }),
    file: Flags.file({
      summary: messages.getMessage('flags.file.summary'),
      helpValue: 'file',
      char: 'f',
    }),
    'stream-to-file': streamToFileFlag,
    body: Flags.string({
      summary: messages.getMessage('flags.body.summary'),
      allowStdin: true,
      helpValue: 'file',
      char: 'b',
    }),
  };

  public static args = {
    url: Args.string({
      description: 'Salesforce API endpoint',
      required: false,
    }),
  };

  public async run(): Promise<void> {
    const { flags, args } = await this.parse(Rest);

    const org = flags['target-org'];
    const streamFile = flags['stream-to-file'];
    const fileOptions: PostmanSchema | undefined = flags.file
      ? (JSON.parse(readFileSync(flags.file, 'utf8')) as PostmanSchema)
      : undefined;

    if (!args.url && !fileOptions?.url) {
      throw new SfError("The url is required either in --file file's content or as an argument");
    }

    const headers = getHeaders(flags.header ?? []);
    if (typeof fileOptions?.header === 'string') {
      const [key, ...rest] = fileOptions.header.split(':');
      headers[key] = rest.join(':').trim();
    } else {
      fileOptions?.header.map((header) => {
        Object.entries(header).map((v) => {
          headers[v[0]] = v[1];
        });
      });
    }

    // the conditional above ensures we either have an arg or it's in the file
    const specified: string | URL = args.url ?? (fileOptions?.url as { raw: string }).raw ?? fileOptions?.url;
    // replace first '/' to create valid URL
    const endpoint = specified.startsWith('/') ? specified.replace('/', '') : specified;
    const url = new URL(
      `${org.getField<string>(Org.Fields.INSTANCE_URL)}/services/data/v${
        flags['api-version'] ?? (await org.retrieveMaxApiVersion())
      }/${endpoint}`
    );

    // because flags.method defaults to "GET" read from file first
    const method = flags.method ?? fileOptions?.method ?? 'GET';

    let body;
    if (method !== 'GET') {
      if (flags.body) {
        body = existsSync(join(process.cwd(), flags.body))
          ? readFileSync(join(process.cwd(), flags.body))
          : // otherwise it's a stdin, and we use it directly
            flags.body;
      } else {
        body = JSON.stringify(fileOptions?.body);
      }
    }

    await org.refreshAuth();

    const options = {
      agent: { https: new ProxyAgent() },
      method,
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
