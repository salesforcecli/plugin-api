# summary

Make an authenticated SOAP API request to a Salesforce org.

# description

This command allows you to make SOAP API requests to Salesforce orgs. You provide the SOAP Body content (the method call), and the command automatically wraps it in a complete SOAP envelope with authentication headers.

The command constructs a full SOAP envelope with:

- SOAP Header containing SessionHeader with your org's access token
- SOAP Body containing your provided XML content

For more information about the Salesforce SOAP API, see https://developer.salesforce.com/docs/atlas.en-us.api.meta/api/sforce_api_quickstart.htm.

# examples

- Make a SOAP request to get server timestamp using the Partner API:

  <%= config.bin %> <%= command.id %> /services/Soap/u/58.0/ --body '<getServerTimestamp/>' --target-org my-org

- Read SOAP Body content from a file:

  <%= config.bin %> <%= command.id %> /services/Soap/u/58.0/ --body @soap-body.xml --target-org my-org

- Save the SOAP response to a file:

  <%= config.bin %> <%= command.id %> /services/Soap/u/58.0/ --body '<getServerTimestamp/>' --target-org my-org --output-file response.xml

- Pipe SOAP Body content from standard input:

  $ echo '<getServerTimestamp/>' | <%= config.bin %> <%= command.id %> /services/Soap/u/58.0/ --body - --target-org my-org

# flags.body.summary

File or XML content for the SOAP Body. Specify "-" to read from standard input. If passing a file, prefix the filename with '@'. The command will extract the SOAP Body content if you provide a full SOAP envelope, or use your content as-is if it's just the method call.

# flags.output-file.summary

File path to save the SOAP response. If not specified, the response is printed to stdout.
