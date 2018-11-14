import fetch from 'node-fetch';
import fs from 'fs';

const args = process.argv.slice(2);

if (args[0] == null) {
  inform('Usage: getUsers <API_TOKEN>');
  process.exit(1);
}

const apiKey = args[0];

const getAllUsers = async () => {
  const resp = await fetch(`https://slack.com/api/users.list?token=${apiKey}`, {
    method: 'GET',
  });

  const json = await resp.json();

  if (json.ok) {
    const members = await json.members.filter(m => !m.deleted);
    return members;
  } else {
    error(json.error);
    return [];
  }
};

const commandParser = async () => {
  const members = await getAllUsers();
  if (args.some(arg.help)) {
    console.log('Usage:');
    console.log('-p: prints all users to file');
    console.log(
      "-g <groupname> -i 'user1, user2, user': Creates a new private group with the listed users",
    );
    console.log(
      "-g <groupname> -e 'user1, user2, user': Creates a new private group with everyone except the listed users",
    );
    process.exit(1);
  }
  if (args.some(arg.include) && args.some(arg.exclude)) {
    inform('Choose either include or exclude');
    process.exit();
  }

  if (args.some(arg.print)) {
    printUserNames(members);
  }

  if (args.some(arg.inviteToNewGroup)) {
    const index = args.indexOf('-g') + 1;
    const name = args[index];

    let mode = 'none';
    if (args.some(arg.include)) {
      mode = 'include';
    } else if (args.some(arg.include)) {
      mode = 'exclude';
    }
    inviteToNewChannel(name, mode);
  }
};

const checkIfMemberExcists = (members, filter) => {
  const doesNotExcist = filter.filter(
    argName => !members.map(m => m.name).includes(argName),
  );
  if (doesNotExcist.length > 0) {
    const formated = doesNotExcist.map(a => `'${a}'`).join(', ');
    warn(`user${sEnding(doesNotExcist)} ${formated} does not exist`);
  }
};

const getExcludeList = members => {
  const index = args.indexOf('-e') + 1;
  const filter = args[index].split(',').map(s => s.replace(/\s/g, ''));
  checkIfMemberExcists(members, filter);
  return members
    .filter(user => !filter.includes(user.name))
    .map(user => user.id);
};

const getIncludeList = members => {
  const index = args.indexOf('-i') + 1;
  const filter = args[index].split(',').map(s => s.replace(/\s/g, ''));
  return members
    .filter(user => filter.includes(user.name))
    .map(user => user.id);
};

const inviteToNewChannel = async (channelName, mode) => {
  if (mode === 'none') {
    warn('Will create group without inviting any users');
  }
  const users = await getAllUsers();

  let inviteList = [];
  if (mode === 'include') {
    inviteList = await getIncludeList(users);
  } else if (mode === 'exclude') {
    inviteList = await getExcludeList(users);
  }

  const newChannel = await createGroup(channelName);
  inviteUsersToGroup(newChannel, inviteList);
};

// invite api
const inviteSuper = async (group, user, type) => {
  const resp = await fetch(
    `https://slack.com/api/${type}s.invite?token=${apiKey}&channel=${group}&user=${user}`,
    {
      method: 'POST',
    },
  );
  const json = await resp.json();
  if (json.ok) {
    inform(`Invited ${user} to ${group} (${json[type].name})`);
  }
};

const inviteUsersToGroup = async (group, users) =>
  users.forEach(user => inviteUserToGroup(group, user));

const inviteUserToGroup = async (group, user) => {
  inviteSuper(group, user, 'group');
};

// create api
const createSuper = async (name, type) => {
  const resp = await fetch(
    `https://slack.com/api/${type}s.create?token=${apiKey}&name=${name}`,
    {
      method: 'GET',
    },
  );
  const json = await resp.json();
  if (json.ok) {
    inform(`Created channel ${json[type].name} with ID ${json[type].id}`);
    return json[type].id;
  } else {
    inform(`Error creating channel: ${json.error}`);
    process.exit(1);
  }
};

const createGroup = async name => createSuper(name, 'group');

const createChannel = async name => {
  createSuper(name, 'channel');
};

// print
const printUserNames = members =>
  console.log(members.map(member => member.name).join(', '));

const printUserListsToFile = members => {
  fs.writeFileSync(
    'members-verbose.json',
    JSON.stringify(
      members.map(m => ({
        id: m.id,
        name: m.name,
        fullName: m.real_name,
        deleted: m.deleted,
        updated_unix: m.updated,
      })),
    ),
  );
  fs.writeFileSync(
    'members-usernames.json',
    JSON.stringify(members.map(m => m.name)),
  );
};

//logs
const error = text => console.error(`Error: ${text}`);
const warn = text => console.warn(`Warning: ${text}`);
const inform = text => console.log(`${text}`);

//flavor
const getListOfBots = async () => {
  const users = await getAllUsers();
  console.log(
    users
      .filter(user => user.is_bot)
      .map(user => user.name)
      .join(', '),
  );
};

const sEnding = items => (items.length === 1 ? '' : 's');

// args
const argOptions = {
  print: ['--print-members', '-p'],
  exclude: ['--exclude', '-e'],
  include: ['-i'],
  createChannel: ['-c'],
  inviteToNewGroup: ['-g'],
  help: ['-h', '--help'],
};

const arg = {
  print: e => checkParamteres(e, 'print'),
  exclude: e => checkParamteres(e, 'exclude'),
  include: e => checkParamteres(e, 'include'),
  createChannel: e => checkParamteres(e, 'createChannel'),
  inviteToNewGroup: e => checkParamteres(e, 'inviteToNewGroup'),
  help: e => checkParamteres(e, 'help'),
};

const checkParamteres = (e, arg) => argOptions[arg].includes(e);

commandParser();
