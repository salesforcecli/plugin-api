/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { createWriteStream, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import got from 'got';
import type { AnyJson } from '@salesforce/ts-types';
import { ProxyAgent } from 'proxy-agent';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { Messages, Org, SFDX_HTTP_HEADERS, SfError } from '@salesforce/core';
import { Args } from '@oclif/core';
import ansis from 'ansis';
import { getHeaders } from '../../../shared/methods.js';

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
    include: Flags.boolean({
      char: 'i',
      summary: messages.getMessage('flags.include.summary'),
      default: false,
      exclusive: ['stream-to-file'],
    }),
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
    'stream-to-file': Flags.string({
      summary: messages.getMessage('flags.stream-to-file.summary'),
      helpValue: 'Example: report.xlsx',
      char: 'S',
      exclusive: ['include'],
    }),
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

    if (streamFile) {
      const responseStream = got.stream(url, options);
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
      const res = await got(url, options);

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
        this.log(res.body === '' ? `Server responded with an empty body, status code ${res.statusCode}` : res.body);
      }

      if (res.statusCode >= 400) {
        process.exitCode = 1;
      }
    }
  }
}
