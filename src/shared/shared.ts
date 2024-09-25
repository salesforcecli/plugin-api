/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { createWriteStream } from 'node:fs';
import { Messages, SfError } from '@salesforce/core';
import type { Headers } from 'got';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import ansis from 'ansis';
import { AnyJson } from '@salesforce/ts-types';
import got from 'got';
import { PostmanSchema } from '../commands/api/request/rest.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-api', 'shared');
export function getHeaders(keyValPair: string[] | PostmanSchema['header'] | undefined): Headers {
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

export async function sendAndPrintRequest(options: {
  streamFile?: string;
  url: URL;
  options: Record<string, unknown>;
  include: boolean;
  this: SfCommand<unknown>;
}): Promise<void> {
  if (options.streamFile) {
    const responseStream = options.options.method
      ? got.stream(options.url, options.options)
      : // default to 'POST' if not specified
        got.stream.post(options.url, options.options);
    const fileStream = createWriteStream(options.streamFile);
    responseStream.pipe(fileStream);

    // we just ensured it existed with the 'if'
    fileStream.on('finish', () => options.this.log(`File saved to ${options.streamFile!}`));
    fileStream.on('error', (error) => {
      throw SfError.wrap(error);
    });
    responseStream.on('error', (error) => {
      throw SfError.wrap(error);
    });
  } else {
    const res =
      options.options.method !== 'POST'
        ? // default to 'POST' if not specified
          await got(options.url, options.options)
        : await got.post(options.url, options.options);
    // Print HTTP response status and headers.
    if (options.include) {
      options.this.log(`HTTP/${res.httpVersion} ${res.statusCode}`);
      Object.entries(res.headers).map(([header, value]) => {
        options.this.log(
          `${ansis.blue.bold(header)}: ${Array.isArray(value) ? value.join(',') : value ?? '<undefined>'}`
        );
      });
    }

    try {
      // Try to pretty-print JSON response.
      options.this.styledJSON(JSON.parse(res.body) as AnyJson);
    } catch (err) {
      // If response body isn't JSON, just print it to stdout.
      options.this.log(res.body);
    }

    if (res.statusCode >= 400) {
      process.exitCode = 1;
    }
  }
}

export const includeFlag = Flags.boolean({
  char: 'i',
  summary: messages.getMessage('flags.include.summary'),
  default: false,
  exclusive: ['stream-to-file'],
});

export const streamToFileFlag = Flags.string({
  summary: messages.getMessage('flags.stream-to-file.summary'),
  helpValue: 'Example: report.xlsx',
  char: 'S',
  exclusive: ['include'],
});
