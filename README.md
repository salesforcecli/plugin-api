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
- [`sf api request rest ENDPOINT`](#sf-api-request-rest-endpoint)

## `sf api request graphql`

Summary of a command.

```
USAGE
  $ sf api request graphql -o <value> --body file [--json] [--flags-dir <value>] [-S Example: report.xlsx | -i]

FLAGS
  -S, --stream-to-file=Example: report.xlsx  Stream responses to a file.
  -i, --include                              Include the HTTP response status and headers in the output.
  -o, --target-org=<value>                   (required) Username or alias of the target org. Not required if the
                                             `target-org` configuration variable is already set.
      --body=file                            (required) File to use as the body for the request. Specify "-" to read
                                             from standard input.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Summary of a command.

  More information about a command. Don't repeat the summary.

EXAMPLES
  $ sf api request graphql
```

_See code: [src/commands/api/request/graphql.ts](https://github.com/salesforcecli/plugin-api/blob/v1.0.0/src/commands/api/request/graphql.ts)_

## `sf api request rest ENDPOINT`

Make an authenticated HTTP request to Salesforce REST API and print the response.

```
USAGE
  $ sf api request rest ENDPOINT -o username [--flags-dir <value>] [-i | -S Example: report.xlsx] [-X
    GET|POST|PUT|PATCH|HEAD|DELETE|OPTIONS|TRACE] [-H key:value...] [--body file]

ARGUMENTS
  ENDPOINT  Salesforce API endpoint

FLAGS
  -H, --header=key:value...                  HTTP header in "key:value" format.
  -S, --stream-to-file=Example: report.xlsx  Stream responses to a file.
  -X, --method=<option>                      [default: GET] HTTP method for the request.
                                             <options: GET|POST|PUT|PATCH|HEAD|DELETE|OPTIONS|TRACE>
  -i, --include                              Include the HTTP response status and headers in the output.
  -o, --target-org=username                  (required) Username or alias of the target org. Not required if the
                                             `target-org` configuration variable is already set.
      --body=file                            File to use as the body for the request. Specify "-" to read from standard
                                             input; specify "" for an empty body.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.

EXAMPLES
  List information about limits in the org with alias "my-org":

    $ sf api request rest 'services/data/v56.0/limits' --target-org my-org

  Get the response in XML format by specifying the "Accept" HTTP header:

    $ sf api request rest 'services/data/v56.0/limits' --target-org my-org --header 'Accept: application/xml',
```

_See code: [src/commands/api/request/rest.ts](https://github.com/salesforcecli/plugin-api/blob/v1.0.0/src/commands/api/request/rest.ts)_

<!-- commandsstop -->
