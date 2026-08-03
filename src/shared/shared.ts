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
import { createWriteStream } from 'node:fs';
import { Messages, SfError } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import ansis from 'ansis';
import { AnyJson } from '@salesforce/ts-types';
import got from 'got';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-api', 'shared');

export function redactError(error: unknown): unknown {
  if (error instanceof Error && 'options' in error) {
    const opts = error as Error & { options?: { headers?: Record<string, unknown> } };
    if (opts.options?.headers) {
      for (const key of Object.keys(opts.options.headers)) {
        if (key.toLowerCase() === 'authorization') {
          opts.options.headers[key] = '[REDACTED]';
        }
      }
    }
  }
  return error;
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
      throw SfError.wrap(redactError(error));
    });
    responseStream.on('error', (error) => {
      throw SfError.wrap(redactError(error));
    });
  } else {
    try {
      const res = options.options.method
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
    } catch (error) {
      throw SfError.wrap(redactError(error));
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
