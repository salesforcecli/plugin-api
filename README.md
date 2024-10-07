## Install

```bash
sf plugins install @salesforce/plugin-api
```

## Issues

Please report any issues at https://github.com/forcedotcom/cli/issues

## Contributing

1. Please read our [Code of Conduct](CODE_OF_CONDUCT.md)
2. Create a new issue before starting your project so that we can keep track of
   what you are trying to add/fix. That way, we can also offer suggestions or
   let you know if there is already an effort in progress.
3. Fork this repository.
4. [Build the plugin locally](#build)
5. Create a _topic_ branch in your fork. Note, this step is recommended but technically not required if contributing using a fork.
6. Edit the code in your fork.
7. Write appropriate tests for your changes. Try to achieve at least 95% code coverage on any new code. No pull request will be accepted without unit tests.
8. Sign CLA (see [CLA](#cla) below).
9. Send us a pull request when you are done. We'll review your code, suggest any needed changes, and merge it in.

### CLA

External contributors will be required to sign a Contributor's License
Agreement. You can do so by going to https://cla.salesforce.com/sign-cla.

### Build

To build the plugin locally, make sure to have yarn installed and run the following commands:

```bash
# Clone the repository
git clone git@github.com:salesforcecli/plugin-template-sf

# Install the dependencies and compile
yarn && yarn build
```

To use your plugin, run using the local `./bin/dev` or `./bin/dev.cmd` file.

```bash
# Run using local run file.
./bin/dev hello world
```

There should be no differences when running via the Salesforce CLI or using the local run file. However, it can be useful to link the plugin to do some additional testing or run your commands from anywhere on your machine.

```bash
# Link your plugin to the sf cli
sf plugins link .
# To verify
sf plugins
```

## Commands

<!-- commands -->

- [`sf api request graphql`](#sf-api-request-graphql)
- [`sf api request rest [URL]`](#sf-api-request-rest-url)

## `sf api request graphql`

Execute a GraphQL statement.

```
USAGE
  $ sf api request graphql -o <value> --body file [--json] [--flags-dir <value>] [--api-version <value>] [-S Example:
    report.xlsx | -i]

FLAGS
  -S, --stream-to-file=Example: report.xlsx  Stream responses to a file.
  -i, --include                              Include the HTTP response status and headers in the output.
  -o, --target-org=<value>                   (required) Username or alias of the target org. Not required if the
                                             `target-org` configuration variable is already set.
      --api-version=<value>                  Override the api version used for api requests made by this command
      --body=file                            (required) File or content with the GraphQL statement. Specify "-" to read
                                             from standard input.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Execute a GraphQL statement.

  Specify the GraphQL statement with the "--body" flag, either directly at the command line or with a file that contains
  the statement. You can query Salesforce records using a "query" statement or use mutations to modify Salesforce
  records.

  This command uses the GraphQL API to query or modify Salesforce objects. For details about the API, and examples of
  queries and mutations, see https://developer.salesforce.com/docs/platform/graphql/guide/graphql-about.html.

EXAMPLES
  Execute a GraphQL query on the Account object by specifying the query directly to the "--body" flag; the command
  uses your default org:

    $ sf api request graphql --body "query accounts { uiapi { query { Account { edges { node { Id \n Name { value } \
      } } } } } }"

  Read the GraphQL statement from a file called "example.txt" and execute it on an org with alias "my-org":

    $ sf api request graphql --body example.txt --target-org my-org

  Pipe the GraphQL statement that you want to execute from standard input to the command:
  $ echo graphql | sf api request graphql --body -

  Write the output of the command to a file called "output.txt" and include the HTTP response status and headers:

    $ sf api request graphql --body example.txt --stream-to-file output.txt --include
```

_See code: [src/commands/api/request/graphql.ts](https://github.com/salesforcecli/plugin-api/blob/1.3.1/src/commands/api/request/graphql.ts)_

## `sf api request rest [URL]`

Make an authenticated HTTP request using the Salesforce REST API.

```
USAGE
  $ sf api request rest [URL] -o <value> [--flags-dir <value>] [-i | -S Example: report.xlsx] [-X
    GET|POST|PUT|PATCH|HEAD|DELETE|OPTIONS|TRACE] [-H key:value...] [-f file | -b file]

ARGUMENTS
  URL  Salesforce API endpoint

FLAGS
  -H, --header=key:value...                  HTTP header in "key:value" format.
  -S, --stream-to-file=Example: report.xlsx  Stream responses to a file.
  -X, --method=<option>                      HTTP method for the request.
                                             <options: GET|POST|PUT|PATCH|HEAD|DELETE|OPTIONS|TRACE>
  -b, --body=file                            File or content for the body of the HTTP request. Specify "-" to read from
                                             standard input or "" for an empty body. If passing a file, prefix the
                                             filename with '@'.
  -f, --file=file                            JSON file that contains values for the request header, body, method, and
                                             URL.
  -i, --include                              Include the HTTP response status and headers in the output.
  -o, --target-org=<value>                   (required) Username or alias of the target org. Not required if the
                                             `target-org` configuration variable is already set.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.

DESCRIPTION
  Make an authenticated HTTP request using the Salesforce REST API.

  When sending the HTTP request with the "--body" flag, you can specify the request directly at the command line or with
  a file that contains the request.

  For a full list of supported REST endpoints and resources, see
  https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_list.htm.

EXAMPLES
  List information about limits in the org with alias "my-org":

    $ sf api request rest 'services/data/v56.0/limits' --target-org my-org

  List all endpoints in your default org; write the output to a file called "output.txt" and include the HTTP response
  status and headers:

    $ sf api request rest '/services/data/v56.0/' --stream-to-file output.txt --include

  Get the response in XML format by specifying the "Accept" HTTP header:

    $ sf api request rest '/services/data/v56.0/limits' --header 'Accept: application/xml'

  Create an account record using the POST method; specify the request details directly in the "--body" flag:

    $ sf api request rest /services/data/v56.0/sobjects/account --body "{\"Name\" : \"Account from REST \
      API\",\"ShippingCity\" : \"Boise\"}" --method POST

  Create an account record using the information in a file called "info.json" (note the @ prefixing the file name):

    $ sf api request rest '/services/data/v56.0/sobjects/account' --body @info.json --method POST

  Update an account record using the PATCH method:

    $ sf api request rest '/services/data/v56.0/sobjects/account/<Account ID>' --body "{\"BillingCity\": \"San \
      Francisco\"}" --method PATCH

  Store the values for the request header, body, and so on, in a file, which you then specify with the --file flag;
  see the description of --file for more information:

    $ sf api request rest --file myFile.json

FLAG DESCRIPTIONS
  -f, --file=file  JSON file that contains values for the request header, body, method, and URL.

    Use this flag instead of specifying the request details with individual flags, such as --body or --method. This
    schema defines how to create the JSON file:

    {
    url: { raw: string } | string;
    method: 'GET', 'POST', 'PUT', 'PATCH', 'HEAD', 'DELETE', 'OPTIONS', 'TRACE';
    description?: string;
    header: string | Array<Record<string, string>>;
    body: { mode: 'raw' | 'formdata'; raw: string; formdata: FormData };
    }

    Salesforce CLI defined this schema to be mimic Postman schemas; both share similar properties. The CLI's schema also
    supports Postman Collections to reuse and share requests. As a result, you can build an API call using Postman,
    export and save it to a file, and then use the file as a value to this flag. For information about Postman, see
    https://learning.postman.com/.

    Here's a simple example of a JSON file that contains values for the request URL, method, and body:

    {
    "url": "sobjects/Account/<Account ID>",
    "method": "PATCH",
    "body" : {
    "mode": "raw",
    "raw": {
    "BillingCity": "Boise"
    }
    }
    }

    See more examples in the plugin-api test directory, including JSON files that use "formdata" to define collections:
    https://github.com/salesforcecli/plugin-api/tree/main/test/test-files/data-project.
```

_See code: [src/commands/api/request/rest.ts](https://github.com/salesforcecli/plugin-api/blob/1.3.1/src/commands/api/request/rest.ts)_

<!-- commandsstop -->

```

```
