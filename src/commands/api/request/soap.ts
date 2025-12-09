/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { readFileSync, writeFileSync } from 'node:fs';
import * as fs from 'node:fs';
import { ProxyAgent } from 'proxy-agent';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { Messages, Org, SfError } from '@salesforce/core';
import { Args } from '@oclif/core';
import got from 'got';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-api', 'soap');

/**
 * Extract namespace from XML content if present
 */
function extractNamespace(xmlContent: string): string | undefined {
  // Try to find xmlns attribute in the root element
  const xmlnsMatch = xmlContent.match(/<[^>]+xmlns\s*=\s*["']([^"']+)["']/);
  if (xmlnsMatch) {
    return xmlnsMatch[1];
  }
  return undefined;
}

/**
 * Remove xmlns attribute from root element if present
 */
function removeXmlnsFromBody(bodyContent: string): string {
  // Remove xmlns attribute from the root element
  return bodyContent.replace(/<([^>\s]+)([^>]*)\s+xmlns\s*=\s*["'][^"']+["']([^>]*)>/i, '<$1$2$3>');
}

/**
 * Extract SOAP Body content from user-provided XML.
 * If user provides a full SOAP envelope, extract just the Body content.
 * If user provides just Body content, return it as-is.
 */
function extractSoapBody(xmlContent: string): string {
  // Try to find SOAP Body content
  // Match <soapenv:Body>...</soapenv:Body> or <Body>...</Body> or <soap:Body>...</soap:Body>
  const bodyMatch = xmlContent.match(
    /<(?:soapenv|soap|SOAP-ENV):Body[^>]*>([\s\S]*?)<\/(?:soapenv|soap|SOAP-ENV):Body>/i
  );
  if (bodyMatch) {
    return bodyMatch[1].trim();
  }

  // Try without namespace prefix
  const bodyMatchNoNs = xmlContent.match(/<Body[^>]*>([\s\S]*?)<\/Body>/i);
  if (bodyMatchNoNs) {
    return bodyMatchNoNs[1].trim();
  }

  // If no SOAP envelope structure found, assume user provided just the Body content
  return xmlContent.trim();
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Create SOAP envelope with SessionHeader and Body content
 */
function createSoapEnvelope(
  bodyContent: string,
  accessToken: string,
  xmlns: string = 'urn:partner.soap.sforce.com'
): string {
  const escapedToken = escapeXml(accessToken);

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<soapenv:Header xmlns="${xmlns}">
<SessionHeader>
<sessionId>${escapedToken}</sessionId>
</SessionHeader>
</soapenv:Header>
<soapenv:Body xmlns="${xmlns}">
${bodyContent}
</soapenv:Body>
</soapenv:Envelope>`;
}

export class Soap extends SfCommand<void> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static state = 'beta';
  public static enableJsonFlag = false;
  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    body: Flags.string({
      summary: messages.getMessage('flags.body.summary'),
      allowStdin: true,
      helpValue: 'file',
      required: true,
    }),
    'output-file': Flags.string({
      summary: messages.getMessage('flags.output-file.summary'),
      helpValue: 'file',
    }),
  };

  public static args = {
    url: Args.string({
      description: 'SOAP API endpoint',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { flags, args } = await this.parse(Soap);

    const org = flags['target-org'];
    const outputFile = flags['output-file'];

    // Read body content
    let bodyContent: string;
    if (flags.body.startsWith('@')) {
      // Remove '@' prefix and read file
      bodyContent = readFileSync(flags.body.substring(1), 'utf8');
    } else if (fs.existsSync(flags.body)) {
      // Check if it's a file path
      bodyContent = readFileSync(flags.body, 'utf8');
    } else {
      // Use body content directly (or stdin content if allowStdin handled it)
      bodyContent = flags.body;
    }

    // Extract SOAP Body content from user input
    let soapBodyContent = extractSoapBody(bodyContent);

    // Detect namespace from body content
    let namespace = extractNamespace(bodyContent);
    if (!namespace) {
      // Default to partner namespace if not detected
      namespace = 'urn:partner.soap.sforce.com';
    }

    // Remove xmlns attribute from body content since it will be set on the Body element
    soapBodyContent = removeXmlnsFromBody(soapBodyContent);

    // Build URL
    const specifiedUrl = args.url.replace(/^\//, '');
    const url = new URL(`${org.getField<string>(Org.Fields.INSTANCE_URL)}/${specifiedUrl}`);

    // Refresh access token to ensure we have a valid access token
    await org.refreshAuth();

    // Get access token
    // eslint-disable-next-line sf-plugin/get-connection-with-version
    const accessToken = org.getConnection().getConnectionOptions().accessToken!;
    if (!accessToken) {
      throw new SfError('No access token available for the org');
    }

    // Create SOAP envelope with detected namespace
    const soapEnvelope = createSoapEnvelope(soapBodyContent, accessToken, namespace);

    // Make SOAP request
    const options = {
      agent: { https: new ProxyAgent() },
      method: 'POST' as const,
      headers: {
        'Content-Type': 'text/xml',
        SOAPAction: '""',
      },
      body: soapEnvelope,
      throwHttpErrors: false,
      followRedirect: false,
    };

    const response = await got(url, options);

    // Handle response
    if (outputFile) {
      writeFileSync(outputFile, response.body, 'utf8');
      this.log(`Response saved to ${outputFile}`);
    } else {
      // Print response body to stdout
      this.log(response.body);
    }

    // Set exit code for errors
    if (response.statusCode >= 400) {
      process.exitCode = 1;
    }
  }
}
