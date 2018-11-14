== Usage
The code is written with ES6 syntax, use `node --experimental-module` or use babel to transpile it (you can do 'yarn transpile' to create a transpiled file called bulk.js)

Exlude and include list on this form:
`-i 'user1, user2, user3'`

Create a private group and add only the include-list
`node slack-bulk-invite.mjs <API_TOKEN> -g <groupname> -i <include-list>`

Create a private group and add everyone except the exclude-list
`node slack-bulk-invite.mjs <API_TOKEN> -g <groupname> -e <exclude-list>`

Print all users to a comma-separatred list
`node slack-bulk-invite.mjs <API_TOKEN> -p`

