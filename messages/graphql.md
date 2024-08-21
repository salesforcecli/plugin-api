# summary

Execute GraphQL statements

# description

Run any valid GraphQL statement via the /graphql [API](https://developer.salesforce.com/docs/platform/graphql/guide/graphql-about.html)

# examples

- Runs the graphql query directly via the command line

  <%= config.bin %> <%= command.id %> --body '{ "query": "query accounts { uiapi { query { Account { edges { node { Id \n Name { value } } } } } } }" }'

- Runs a mutation to create an Account, with an `example.txt` file, containing

```text
mutation AccountExample{
  uiapi {
    AccountCreate(input: {
      Account: {
        Name: "Trailblazer Express"
      }
    }) {
      Record {
        Id
        Name {
          value
        }
      }
    }
  }
}
```

<%= config.bin %> <%= command.id %> --body example.txt

will create a new account returning specified fields (Id, Name)

# flags.header.summary

HTTP header in "key:value" format.

# flags.body.summary

File or content with GraphQL statement. Specify "-" to read from standard input.
