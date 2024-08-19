/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { SfError } from '@salesforce/core';
import type { Headers } from 'got';

export function getHeaders(keyValPair: string[]): Headers {
  const headers: { [key: string]: string } = {};

  for (const header of keyValPair) {
    const [key, ...rest] = header.split(':');
    const value = rest.join(':').trim();
    if (!key || !value) {
      throw new SfError(`Failed to parse HTTP header: "${header}".`, 'Failed To Parse HTTP Header', [
        'Make sure the header is in a "key:value" format, e.g. "Accept: application/json"',
      ]);
    }
    headers[key] = value;
  }

  return headers;
}
