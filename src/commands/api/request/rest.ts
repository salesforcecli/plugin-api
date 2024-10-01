/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { readFileSync, createReadStream } from 'node:fs';
import { ProxyAgent } from 'proxy-agent';
import type { Headers } from 'got';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { Messages, Org, SFDX_HTTP_HEADERS, SfError } from '@salesforce/core';
import { Args } from '@oclif/core';
import FormData from 'form-data';
import { includeFlag, sendAndPrintRequest, streamToFileFlag } from '../../../shared/shared.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-api', 'rest');
const methodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'HEAD', 'DELETE', 'OPTIONS', 'TRACE'] as const;

export type PostmanSchema = {
  url: { raw: string } | string;
  method: typeof methodOptions;
  description?: string;
  header: string | Array<{ key: string; value: string; disabled?: boolean; description?: string }>;
  body: {
    mode: 'raw' | 'formdata';
    raw: string;
    formdata: Array<{ key: string; type: 'file' | 'text'; src?: string | string[]; value: string }>;
  };
};

export class Rest extends SfCommand<void> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static state = 'beta';
  public static enableJsonFlag = false;
  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    include: includeFlag,
    method: Flags.option({
      options: methodOptions,
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
      description: messages.getMessage('flags.file.description'),
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

    // validate that we have a URL to hit
    if (!args.url && !fileOptions?.url) {
      throw new SfError("The url is required either in --file file's content or as an argument");
    }

    // the conditional above ensures we either have an arg or it's in the file - now we just have to find where the URL value is
    const specified = args.url ?? (fileOptions?.url as { raw: string }).raw ?? fileOptions?.url;
    const url = new URL(
      `${org.getField<string>(Org.Fields.INSTANCE_URL)}/services/data/v${
        flags['api-version'] ?? (await org.retrieveMaxApiVersion())
        // replace first '/' to create valid URL
      }/${specified.replace(/\//y, '')}`
    );

    // default the method to GET here to allow flags to override, but not hinder reading from files, rather than setting the default in the flag definition
    const method = flags.method ?? fileOptions?.method ?? 'GET';
    // @ts-expect-error users _could_ put one of these in their file without knowing it's wrong - TS is smarter than users here :)
    if (!methodOptions.includes(method)) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new SfError(`"${method}" must be one of ${methodOptions.join(', ')}`);
    }

    const body = method !== 'GET' ? flags.body ?? getBodyContents(fileOptions?.body) : undefined;
    let headers = getHeaders(flags.header ?? fileOptions?.header);

    if (body instanceof FormData) {
      // if it's a multi-part formdata request, those have extra headers
      headers = { ...headers, ...body.getHeaders() };
    }

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

    await org.refreshAuth();

    await sendAndPrintRequest({ streamFile, url, options, include: flags.include, this: this });
  }
}
const getBodyContents = (body?: PostmanSchema['body']): string | FormData => {
  if (body?.mode === 'raw') {
    return JSON.stringify(body.raw);
  } else {
    // parse formdata
    const form = new FormData();
    body?.formdata.map((data) => {
      if (data.type === 'text') {
        form.append(data.key, data.value);
      } else if (data.type === 'file' && typeof data.src === 'string') {
        form.append(data.key, createReadStream(data.src));
      } else if (Array.isArray(data.src)) {
        form.append(data.key, data.src);
      }
    });

    return form;
  }
};

function getHeaders(keyValPair: string[] | PostmanSchema['header'] | undefined): Headers {
  if (!keyValPair) return {};
  const headers: { [key: string]: string } = {};

  if (typeof keyValPair === 'string') {
    const [key, ...rest] = keyValPair.split(':');
    headers[key.toLowerCase()] = rest.join(':').trim();
  } else {
    keyValPair.map((header) => {
      if (typeof header === 'string') {
        const [key, ...rest] = header.split(':');
        const value = rest.join(':').trim();
        if (!key || !value) {
          throw new SfError(`Failed to parse HTTP header: "${header}".`, 'Failed To Parse HTTP Header', [
            'Make sure the header is in a "key:value" format, e.g. "Accept: application/json"',
          ]);
        }
        headers[key.toLowerCase()] = value;
      } else if (!header.disabled) {
        headers[header.key.toLowerCase()] = header.value;
      }
    });
  }

  return headers;
}
