# summary

Make an authenticated HTTP request to Salesforce REST API and print the response.

# examples

- List information about limits in the org with alias "my-org":

  <%= config.bin %> <%= command.id %> 'limits' --target-org my-org

- List all endpoints

  <%= config.bin %> <%= command.id %> '/'

- Get the response in XML format by specifying the "Accept" HTTP header:

  <%= config.bin %> <%= command.id %> 'limits' --target-org my-org --header 'Accept: application/xml'

- POST to create an Account object

  <%= config.bin %> <%= command.id %> 'sobjects/account' --body "{\"Name\" : \"Account from REST API\",\"ShippingCity\" : \"Boise\"}" --method POST

- or with a file 'info.json' containing

```json
{
  "Name": "Demo",
  "ShippingCity": "Boise"
}
```

<%= config.bin %> <%= command.id %> 'sobjects/account' --body info.json --method POST

- Update object

  <%= config.bin %> <%= command.id %> 'sobjects/account/<Account ID>' --body "{\"BillingCity\": \"San Francisco\"}" --method PATCH

- You can store every flag option as a parameter in a json file, with the following schema:
  {
  body?: string;
  header?: string[];
  url?: string;
  method?: string;
  }

  looking at the example above, we could store all of this information in the file, and change the command to

  <%= config.bin %> <%= command.id %> --file myFile.json

  where myFile.json contains
  {
  "url": "sobjects/Account/<Account ID>",
  "method": "PATCH",
  "body" : {"BillingCity": "Boise"}
  }

# flags.method.summary

HTTP method for the request.

# flags.file.summary

A json file to store values for header/body/method/url - this is the same format as a Postman Collection Format

# flags.header.summary

HTTP header in "key:value" format.

# flags.body.summary

File to use as the body for the request. Specify "-" to read from standard input; specify "" for an empty body.
