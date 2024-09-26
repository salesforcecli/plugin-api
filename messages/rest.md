# summary

Make an authenticated HTTP request using the Salesforce REST API.

# description

When sending the HTTP request with the "--body" flag, you can specify the request directly at the command line or with a file that contains the request.

For a full list of supported REST endpoints and resources, see https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_list.htm.

# examples

- List information about limits in the org with alias "my-org":

  <%= config.bin %> <%= command.id %> 'limits' --target-org my-org

- List all endpoints in your default org; write the output to a file called "output.txt" and include the HTTP response status and headers:

  <%= config.bin %> <%= command.id %> '/' --stream-to-file output.txt --include

- Get the response in XML format by specifying the "Accept" HTTP header:

  <%= config.bin %> <%= command.id %> 'limits' --header 'Accept: application/xml'

- Create an account record using the POST method; specify the request details directly in the "--body" flag:

  <%= config.bin %> <%= command.id %> sobjects/account --body "{\"Name\" : \"Account from REST API\",\"ShippingCity\" : \"Boise\"}" --method POST

- Create an account record using the information in a file called "info.json":

  <%= config.bin %> <%= command.id %> 'sobjects/account' --body info.json --method POST

- Update an account record using the PATCH method:

  <%= config.bin %> <%= command.id %> 'sobjects/account/<Account ID>' --body "{\"BillingCity\": \"San Francisco\"}" --method PATCH

- You can store every flag option as a parameter in a json file, with the following schema:
  {
  url: { raw: string } | string;
  method: 'GET', 'POST', 'PUT', 'PATCH', 'HEAD', 'DELETE', 'OPTIONS', 'TRACE';
  description?: string;
  header: string | Array<Record<string, string>>;
  body: { mode: 'raw' | 'formdata'; raw: string; formdata: FormData };
  }

  looking at the example above, we could store all of this information in the file, and change the command to

  <%= config.bin %> <%= command.id %> --file myFile.json

  where myFile.json contains
  {
  "url": "sobjects/Account/<Account ID>",
  "method": "PATCH",
  "body" : {"BillingCity": "Boise"}
  }

- If you work in Postman a lot this schema may look familiar, because it shares as many similar properties as we could. Building an API call in postman then exporting and saving the file and executing via the CLI is now possible.
-

# flags.method.summary

HTTP method for the request.

# flags.file.summary

A json file to store values for header/body/method/url - this is the same format as a Postman Collection Format

# flags.header.summary

HTTP header in "key:value" format.

# flags.body.summary

File or content for the body of the HTTP request. Specify "-" to read from standard input or "" for an empty body.
