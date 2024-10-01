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

- Rather than specify all the argument and flag values at the command line, store them in a file which you pass to the command; see the description of the --file flag for more information:

  <%= config.bin %> <%= command.id %> --file myFile.json

# flags.method.summary

HTTP method for the request.

# flags.file.summary

JSON file to store values for the header/body/method/url

# flags.file.description

You can store every flag option as a parameter in a json file, with the following schema:

{
url: { raw: string } | string;
method: 'GET', 'POST', 'PUT', 'PATCH', 'HEAD', 'DELETE', 'OPTIONS', 'TRACE';
description?: string;
header: string | Array<Record<string, string>>;
body: { mode: 'raw' | 'formdata'; raw: string; formdata: FormData };
}

<%= config.bin %> <%= command.id %> --file myFile.json

where myFile.json contains
{
"url": "sobjects/Account/<Account ID>",
"method": "PATCH",
"body" : {"BillingCity": "Boise"}
}

If you work in Postman a lot this schema may look familiar, because it shares as many similar properties as we could. Building an API call in postman then exporting and saving the file and executing via the CLI is now possible.

The format of the file is similar to the Postman Collection Format. For example:

{
"method": "POST",
"header": [
{
"key": "content-type",
"value": "multipart/form-data"
},
{
"key": "Accept",
"value": "application/json"
}
],
"body": {
"mode": "formdata",
"formdata": [
{
"key": "json",
"type": "text",
"value": "{\"cropY\":\"0\",\"cropX\":\"0\",\"cropSize\":\"200\"}"
} ,
{
"key": "fileUpload",
"type": "file",
"src": "myImg.jpeg"
}
]
},
"url": "connect/user-profiles/me/photo"
}

See more examples in this repo's test directory https://github.com/salesforcecli/plugin-api/tree/main/test/test-files/data-project.

# flags.header.summary

HTTP header in "key:value" format.

# flags.body.summary

File or content for the body of the HTTP request. Specify "-" to read from standard input or "" for an empty body.
